
var isChrome = navigator.userAgent.toLowerCase().match(/chrome/) != null ;



//加载iciba内容脚本
function loadContentScripts_ICIBA() {
    //browser.tabs.insertCSS({file: "content_scripts/huaci_mini.css"});
    let runAt = "document_idle";
    browser.tabs.executeScript({
        file: "/resources/browser-polyfill.min.js",
        allFrames: false,
        runAt: runAt
    }).then(function () {
        browser.tabs.executeScript({
            file: "/resources/js/jquery.min.js",
            allFrames: false,
            runAt: runAt
        }).then(function () {
            browser.tabs.executeScript({
                file: "/content_scripts/translate-iciba.js",
                allFrames: false,
                runAt: runAt
            });
        });
    });
    let cssFileName = isChrome?"huaci_mini_chrome.css":"huaci_mini.css";
    browser.tabs.insertCSS({
        file:"/content_css/"+cssFileName,
        allFrames: false,
        runAt: runAt
    });



}

/*给页面的右键菜单添加选项*/
function addContentMenu(){
    chrome.contextMenus.create({
        id: "load-web-translate",
        title: "开启划词"
    });
    chrome.contextMenus.create({
        id: "config-web-translate",
        title: "配置PDF-Translate"
    });
	/*
    chrome.contextMenus.create({
        id: "open-local-pdf",
        title: "打开本地PDF文件"
    });*/

    chrome.contextMenus.onClicked.addListener(function(info, tab) {
        if (info.menuItemId === "load-web-translate") {
            loadContentScripts_ICIBA();
        }else if (info.menuItemId === "config-web-translate"){
            chrome.runtime.openOptionsPage();
        }else if( info.menuItemId === "open-local-pdf"){
            if(isChrome){
                chrome.tabs.create({url: "/content_scripts/pdfjs/web/viewer.html"});
            }else{
                browser.tabs.create({url: "/content_scripts/pdfjs/web/viewer.html"});
            }

        }
    });
}
/*删除页面的右键菜单*/
function removeContentMenu(){
    chrome.contextMenus.removeAll();
}

addContentMenu();

function isPdfFile(details) {
  var header = getHeaderFromHeaders(details.responseHeaders, 'content-type');
  if (header) {
    var headerValue = header.value.toLowerCase().split(';', 1)[0].trim();
    if (headerValue === 'application/pdf') {
      return true;
    }
    if (headerValue === 'application/octet-stream') {
      if (details.url.toLowerCase().indexOf('.pdf') > 0) {
        return true;
      }
      var cdHeader =
        getHeaderFromHeaders(details.responseHeaders, 'content-disposition');
      if (cdHeader && /\.pdf(["']|$)/i.test(cdHeader.value)) {
        return true;
      }
    }
  }
  return false;
}
function getHeadersWithContentDispositionAttachment(details) {
  var headers = details.responseHeaders;
  var cdHeader = getHeaderFromHeaders(headers, 'content-disposition');
  if (!cdHeader) {
    cdHeader = { name: 'Content-Disposition', };
    headers.push(cdHeader);
  }
  if (!/^attachment/i.test(cdHeader.value)) {
    cdHeader.value = 'attachment' + cdHeader.value.replace(/^[^;]+/i, '');
    return { responseHeaders: headers, };
  }
  return undefined;
}
function getHeaderFromHeaders(headers, headerName) {
  for (var i = 0; i < headers.length; ++i) {
    var header = headers[i];
    if (header.name.toLowerCase() === headerName) {
      return header;
    }
  }
  return undefined;
}
'use strict';

var VIEWER_URL = chrome.extension.getURL('content_scripts/pdfjs/web/viewer.html');

function getViewerURL(pdf_url) {
  return VIEWER_URL + '?file=' + encodeURIComponent(pdf_url);
}

/**
 * @param {Object} details First argument of the webRequest.onHeadersReceived
 *                         event. The property "url" is read.
 * @return {boolean} True if the PDF file should be downloaded.
 */
function isPdfDownloadable(details) {
  if (details.url.includes('pdfjs.action=download')) {
    return true;
  }
  // Display the PDF viewer regardless of the Content-Disposition header if the
  // file is displayed in the main frame, since most often users want to view
  // a PDF, and servers are often misconfigured.
  // If the query string contains "=download", do not unconditionally force the
  // viewer to open the PDF, but first check whether the Content-Disposition
  // header specifies an attachment. This allows sites like Google Drive to
  // operate correctly (#6106).
  if (details.type === 'main_frame' && !details.url.includes('=download')) {
    return false;
  }
  var cdHeader = (details.responseHeaders &&
    getHeaderFromHeaders(details.responseHeaders, 'content-disposition'));
  return (cdHeader && /^attachment/i.test(cdHeader.value));
}
chrome.webRequest.onHeadersReceived.addListener(
  function(details) {
    if (details.method !== 'GET') {
      // Don't intercept POST requests until http://crbug.com/104058 is fixed.
      return undefined;
    }
    if (!isPdfFile(details)) {
      return undefined;
    }
    if (isPdfDownloadable(details)) {
      // Force download by ensuring that Content-Disposition: attachment is set
      return getHeadersWithContentDispositionAttachment(details);
    }

    var viewerUrl = getViewerURL(details.url);
	 getCurrentTabId(tabId => {chrome.tabs.update(tabId, {url: viewerUrl})})
    //chrome.tabs.update(tabId, {url: viewerUrl})
    // Implemented in preserve-referer.js
    //saveReferer(details);

    return { redirectUrl: viewerUrl, };
  },
  {
    urls: [
      '<all_urls>'
    ],
    types: ['main_frame', 'sub_frame'],
  },
  ['blocking', 'responseHeaders']);












/**
 * Transforms a valid match pattern into a regular expression
 * which matches all URLs included by that pattern.
 *
 * @param  {string}  pattern  The pattern to transform.
 * @return {RegExp}           The pattern's equivalent as a RegExp.
 * @throws {TypeError}        If the pattern is not a valid MatchPattern
 */

// matches all valid match patterns (except '<all_urls>')
// and extracts [ , scheme, host, path, ]
const matchPattern = (/^(?:(\*|http|https|file|ftp|app):\/\/([^\/]+|)\/?(.*))$/i);

function matchPatternToRegExp(pattern) {
    if (pattern === '<all_urls>') {
        return (/^(?:https?|file|ftp|app):\/\//);
    }
    const match = matchPattern.exec(pattern);
    if (!match) {
        throw new TypeError(`"${ pattern }" is not a valid MatchPattern`);
    }
    const [ , scheme, host, path, ] = match;
    return new RegExp('^(?:'
        + (scheme === '*' ? 'https?' : escape(scheme)) + ':\\/\\/'
        + (host === '*' ? "[^\\/]*" : escape(host).replace(/^\*\./g, '(?:[^\\/]+)?'))
        + (path ? (path == '*' ? '(?:\\/.*)?' : ('\\/' + escape(path).replace(/\*/g, '.*'))) : '\\/?')
        + ')$');
}

function getUrlRegExp (pattern) {
    if(pattern.substr(0,1)==='/'){
        let pp = pattern.substr(1).replace(/\/$/,"");
        return new RegExp(pp);
    }else return matchPatternToRegExp(pattern);
}

function getCurrentTabId(callback)
{
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs)
    {
        if(callback) callback(tabs.length ? tabs[0].id: null);
    });
}

/*监听tab,若有匹配的url,则加载组件*/
function handleUpdated(tabId, changeInfo, tabInfo) {
	if (changeInfo.status == 'complete' && tabInfo.status == 'complete' && tabInfo.url != undefined) {
    let m =tabInfo.active&&!/^about:/.test(tabInfo.url)&&tabInfo.url!=="chrome://newtab/";
	console.log(m);
    if (m) {

        let readSuccess = function (items) {
            /*读取配置*/
            let isMatch = false;
            let whichPattern = '';
            let {AppConfig}=items;
			
			//console.log(items);
            if (AppConfig.rules) {
                AppConfig.rules.forEach(function (obj) {
                    if(isMatch||!obj.status) return;//如果已经发现匹配,或者某规则被禁用,此时执行return跳过剩下的地址匹配
                    if (obj.pattern) {
                        let match = getUrlRegExp(obj.pattern);
                        let r = match.test(tabInfo.url);
                        if (r) {
                            isMatch = r;
                            whichPattern = obj.pattern;
                            console.log("  test "+tabInfo.url,obj.pattern,"--->",isMatch);
                        }

                    }
                });

            }
			/*
			if (isMatch) {
				
				if(/\.(pdf)$/.test(tabInfo.url)){
				alert(true);
				url=chrome.runtime.getURL("content_scripts/pdfjs/web/viewer.html?file=" + tabInfo.url);
		        getCurrentTabId(tabId => {chrome.tabs.update(tabId, {url: url})});
				};
                AppConfig.env.tabInfo = tabInfo ;
                loadContentScripts_ICIBA();
            }*/
			
			
            if (AppConfig.publicConfig.isOpen){
                if (isMatch) {
				//alert('ss');
				    //if (AppConfig.publicConfig.isdefaultPDFviewer){
				    url=chrome.runtime.getURL("content_scripts/pdfjs/web/viewer.html?file=" + tabInfo.url);
		            chrome.tabs.update(tabId, {url: url});
		        }
			
                AppConfig.env.tabInfo = tabInfo ;
				console.log('dd');
                loadContentScripts_ICIBA();
            }else if(isMatch&&AppConfig.publicConfig.isdefaultPDFviewer){
				url=chrome.runtime.getURL("content_scripts/pdfjs/web/viewer.html?file=" + tabInfo.url);
		        //getCurrentTabId(tabId => {
			    chrome.tabs.update(tabId, {url: url});//});
			}
			
			

        };
        let readFail = function (items) {};
        if(isChrome){
            chrome.storage.local.get("AppConfig",readSuccess);
        }else {
            browser.storage.local.get("AppConfig").then(readSuccess, readFail);
        }



    }
	}


}

chrome.tabs.onUpdated.addListener(handleUpdated);

let appConfigFromMemory = {
    rules:[
        {index:1,status:1,pattern:"file:///*/*.pdf",note:"pdf文件(本地打开123)"},
        {index:2,status:1,pattern:"*://*/*.pdf",note:"pdf文件(在线形式,以http,https,ftp等协议开头)"},
        {index:3,status:1,pattern:"*://www.chinadaily.com.cn/*",note:"中国日报"},
        {index:4,status:1,pattern:"/.*://english\\.sina\\.com.*/",note:"新浪英文版(正则匹配)"},
        {index:5,status:1,pattern:"/^(http|https)://en\\.people\\.cn.*/",note:"人民网英文版(正则匹配)"},
        {index:6,status:0,pattern:"https://sarabander.github.io/sicp/html/index.xhtml",note:"sicp在线书籍(英文)"},
    ],
    publicConfig:{
        isOpen:true,isTip:true,isRightMenu:true,autoLoadWhenOpenPDF:true,autoPopup:false,isHttps:true,timedOutForWaiting:350,autoSound:true,isdefaultPDFviewer:true
    },
    pdfConfig:{pagecolor:"#C7EDCC",switch_position:"inner",switch_bgcolor:"#C7EDCC",custom_css:""},
    webConfig:{custom_css:""},
    env:{},
    system:{}

};


let preQueryData = null;
let requestCounter = 0;
function getCounter() {
    if(requestCounter>0){
        requestCounter--;
        return true;
    }else{
        console.log("计数器已用完("+requestCounter+")，不允许再发送http请求：");
        return false;
    }
}

function notify(message, sender, sendResponse) {
    if (message.action==="playAudio") {
        let audio1 = document.getElementById("mp3_player");
        audio1.src = message.url;
        let playPromise = audio1.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                //发音成功后要做的事情
            })
                .catch(error => {
                    //发音失败后要做的事情
                });
        }


    }

    if (message.action && message.action === "queryAppConfig") {
        // console.log("收到命令：",message.action);
        if (isChrome) {
            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {

                chrome.runtime.getPackageDirectoryEntry(function (root) {
                    let errorHandler = function (err) {
                        console.log("proccess file Error:", err)
                    };
                    root.getFile("background/appConfig.json", {}, function (fileEntry) {
                        fileEntry.file(function (file) {
                            var reader = new FileReader();
                            reader.onloadend = function (e) {
                                // contents are in this.result
                                let config = JSON.parse(e.target.result);
                                let system = config.system;
                                //查询已存储的数据并合并，然后再发送
                                chrome.storage.local.get(["AppConfig"], function (data) {
                                    Object.assign(config, data.AppConfig ? data.AppConfig : {}, {system});//以storage中的为准，文件中的数据只负责初始化
                                    // console.log("发送数据:",config);
                                    chrome.tabs.sendMessage(tabs[0].id, {AppConfig: config}, function (response) {
                                        // console.log("收到回应",response.farewell);
                                    });
                                });

                            };
                            reader.readAsText(file);
                        }, errorHandler);
                    }, errorHandler);
                });

            });
        }

    }

    if (message.action && message.action === "loadIcibaScript") {
        loadContentScripts_ICIBA();
    }
    if (message.action && message.action === "getWordResult") {
        //注意，此段代码额外依赖于变量 preQueryData 和 requestCounter（请求计数器，用来确保不会陷入无限递归请求中）
        requestCounter = 2;
        let sendData = function (data) {
            browser.tabs.sendMessage(
                sender.tab.id,
                data
            ).then(function (res) {
                if (res) console.log(res);
            }).catch(function (error) {
                console.error(`Error: ${error}`);
            });
        };
        let url = message.url;
        let isCapital = /[A-Z]/.test(url.split(/\?word=/)[1].substring(0, 1));

        let wordResult = {};//释义数据，用来发送到content script

        let xhr = new XMLHttpRequest();
        xhr.timeout = 10000;//超时时间
        xhr.ontimeout = function (e) {
            // XMLHttpRequest 超时。在此做某事。
            wordResult = {status: "timeout", WordResult: null, timeout: e.target.timeout};
            sendData(wordResult);
        };
        xhr.onprogress = function (evt) {
            if (evt.lengthComputable) {
                let percentComplete = evt.loaded / evt.total;
                console.log("请求进度：", percentComplete);
            } else {
                // Unable to compute progress information since the total size is unknown
            }
        };
        xhr.onerror = function (evt) {
            console.log(evt);
            wordResult = {
                status: "error",
                WordResult: null,
                error: {readyState: evt.target.readyState, status: evt.target.status}
            };
            sendData(wordResult);
        };
        xhr.onreadystatechange = function (para) {
            if (para.target.readyState === XMLHttpRequest.DONE && para.target.status === 200) {

                let response = para.target.response;
                //获取数据之后，对数据进行第一次正则替换，清洗不必要的冗余数据,并替换一些会产生bug的数据
                let data = response.replace(/[\s\S]*innerHTML='/g, '')
                        .replace(/';[\s]*dict\.style\.display[\s\S]*/g, '')
                        .replace(/[\\]/g, '')
                        .replace(/onclick=/g, "data-src=")
                    + '</div>';
                if (isCapital && /\[人名\]/.test(data)) {//是否执行再次请求？当请求的word的首字母为大写且释义仅包含人名的时候为真
                    preQueryData = data;//使用变量储存第一次请求的数据
                    //必须确保下一次请求时isCapital为false，否则有可能陷入无限递归循环请求！
                    const newUrl = url.toLowerCase();
                    if(getCounter()){
                        isCapital=false;//手动关闭开关，防止多次请求
                        xhr.open("get", newUrl);
                        xhr.send();//再次发送请求
                    }
                    return; //关键一招，不return则会发送两次数据到content script，会造成混淆
                }
                if (preQueryData) {
                    //合并两次请求的结果,若进行到这一步，两次请求的结果均已清洗
                    //提取前一个请求和当前请求数据中的释义,注意slice方法并不会改变data变量的数据
                    let pre = preQueryData.slice(preQueryData.indexOf('<div class="icIBahyI-simple">'), preQueryData.indexOf('</div><div class="icIBahyI-footer">'));
                    let current = data.slice(data.indexOf('<div class="icIBahyI-simple">'), data.indexOf('</div><div class="icIBahyI-footer">'));
                    //将释义合并,插入当前结果中
                    let temp = data.split('</div><div class="icIBahyI-footer">');
                    if (temp.length > 0 && pre !== current) { //当且仅当两次查询的结果不同时，才执行合并
                        temp[0] = temp[0] + pre;
                    }

                    data = temp.join('</div><div class="icIBahyI-footer">');
                    wordResult = {WordResult: data, isMerge: true, status: "success"};

                    preQueryData = null;//合并结束之后必须清除第一次请求的数据，防止副作用

                } else {
                    wordResult = {WordResult: data, isMerge: false, status: "success"};
                }

                //现在可以使用data数据了,直接发送到content script
                // sendResponse({WordResult: data});
                sendData(wordResult);
            }
        };

        if(getCounter()){
            xhr.open("get", url, true);
            xhr.send();
        }


    }

}

browser.runtime.onMessage.addListener(notify);

let xhr = new XMLHttpRequest();
xhr.onload=function (para) {
    let appConfigFromFile = this.response ;
    browser.storage.local.get(["AppConfig"]).then(function (data) {
        const appConfigFromUser=data.AppConfig?data.AppConfig:{};
        const appConfig=Object.assign({},appConfigFromFile,appConfigFromMemory,appConfigFromUser);
        browser.storage.local.set({"AppConfig":appConfig});
    });
};
xhr.onerror=function (err) {
    console.log("proccess file Error:",err);
    //如果读取文件失败，则使用变量来初始化
    browser.storage.local.get(["AppConfig"]).then(function (data) {
        const appConfigFromUser=data.AppConfig?data.AppConfig:{};
        chrome.storage.local.set({"AppConfig":Object.assign({},appConfigFromMemory,appConfigFromUser)});
    });
};
xhr.responseType="json";
let url =  browser.extension.getURL("background/appConfig.json");

xhr.open("get",url,true);
xhr.setRequestHeader('Content-type', 'application/json');
xhr.send();


