var isChrome = navigator.userAgent.toLowerCase().match(/chrome/) != null;

/**
 数据结构定义
 */
function URLPattern(index, pattern, note, status) {
    this.index = index;
    this.pattern = pattern;
    this.note = note;
    this.status = (status === undefined || status === null) ? 1 : status;
}

URLPattern.prototype.toString = function () {
    return this.index + " " + this.pattern + " " + this.note;
};

function PdfConfig(para) {
    this.pagecolor = para.pagecolor;
    this.switch_position = para.switch_position;
    this.switch_bgcolor = para.switch_bgcolor;
    this.custom_css = para.custom_css;
    this.downloadPath = para.downloadPath;
}

PdfConfig.prototype.toString = function () {
    return this.pagecolor + this.switch_position + this.switch_bgcolor + "[]" + this.custom_css;
};

/**
 * 数据库工具类
 * 1. 负责读写数据,当前使用的数据存储是火狐默认的,单个数据大小上限为1M
 * */
var DatabaseUtil = {

    /*把配置储存到本地Local*/
    savePatternsToLocal: function (data, callback) {
        if (data.length === 0) document.querySelector("#load_default").style.display = "";
        if (typeof callback !== "function") {
            callback = function (rules) {
                PageUtil.updatePatternsView(rules).noticePatterns("保存成功,页面已更新")
            };
        }
        browser.storage.local.get("AppConfig").then(function (items) {
            let {AppConfig} = items;
            AppConfig.rules = data;
            browser.storage.local.set({AppConfig}).then(callback(AppConfig.rules));
        });

    },
    savePdfConfigToLocal: function (data) {
        browser.storage.local.get("AppConfig").then(function (items) {
            let {AppConfig} = items;
            AppConfig.pdfConfig = data;
            browser.storage.local.set({AppConfig}).then(function () {
                PageUtil.updatePdfConfigView(AppConfig.pdfConfig).noticePdfConfig("保存成功,页面已更新")
            });
        });

    },
    saveWebConfigToLocal: function (data) {
        browser.storage.local.get("AppConfig").then(function (items) {
            let {AppConfig} = items;
            AppConfig.webConfig = data;
            browser.storage.local.set({AppConfig}).then(function () {
                PageUtil.updateWebConfigView(AppConfig.webConfig).noticeWebConfig("保存成功,页面已更新")
            });
        });
    }

};


/**
 *  页面事件处理类
 1. 负责定义各种页面的事件,比如按钮,单击,双击,弹出,通知等事件的处理
 2. 负责协调各层之间的复杂交互逻辑
 */
var PageHandler = {

    /**专门处理UrlPatterns模块的事件*/
    addPatterns: function () {
        let textarea = document.querySelector("#textarea_url_patterns");
        document.querySelector("#div_url_add").style.display = "inherit";
        textarea.focus();
        textarea.value = '';
    },
    savePatterns: function (data) {
        DatabaseUtil.savePatternsToLocal(PageUtil.getUrlPatternsFromPage());
        document.querySelector("#textarea_url_patterns").value = '';
        document.querySelector("#div_url_add").style.display = "none";
    },


    /**专门处理PDF配置模块的事件**/
    savePdfConfig: function () {
        DatabaseUtil.savePdfConfigToLocal(PageUtil.getPdfConfigFromPage());
    },


    /**专门处理WEB配置模块的事件*/
    saveWebConfig: function () {
        DatabaseUtil.saveWebConfigToLocal(PageUtil.getWebConfigFromPage());
    }
};


/**
 * 页面工具类,负责页面事件的注册,从页面获取数据等
 *
 * */

var PageUtil = {
    /*初始化3大配置模块*/
    initAll: function () {
        PageUtil.initUrlPatterns();
        PageUtil.initPdfConfig();
        PageUtil.initWebConfig();
    },

    /*模块URLPatterns的页面事件*/
    initUrlPatterns: function () {
        document.querySelector("#url_add").addEventListener("click", PageHandler.addPatterns);
        document.querySelector("#url_save").addEventListener("click", PageHandler.savePatterns);
        PageUtil.initTableEvents();
        PageUtil.initPatternBtns();
    },
    initTableEvents: function () {
        document.querySelectorAll("#table_url_patterns tr:not([class='table-header']) td.url-pattern,#table_edit_element").forEach(function (e) {
            e.addEventListener('mouseenter', function (item) {
                if ($(item.target).attr("id") !== "table_edit_element") {
                    document.querySelector("#table_edit_element").setAttribute("class", "table-div-show");
                    let currentWidth = $(item.target.parentNode.querySelector("td.url-pattern")).width();
                    let currentHeight = $(item.target.parentNode.querySelector("td.url-pattern")).height();

                    /*使用相对定位来显示删除按钮*/
                    let currentOffset = $(item.target.parentNode.querySelector("td.url-pattern")).offset();
                    $("#table_edit_element").offset({
                        top: currentOffset.top + currentHeight * 1 / 3,
                        left: currentOffset.left + currentWidth - 5
                    });
                    $("#table_edit_element").data("targetElement", item.target.parentNode);
                } else {
                    document.querySelector("#table_edit_element").setAttribute("class", "table-div-show");
                }
            });
            e.addEventListener("mouseleave", function (item) {
                document.querySelector("#table_edit_element").setAttribute("class", "table-div-hide");
            }, false);

        });
        document.querySelector("#load_default").addEventListener("click", function (e) {
            let index = 1, status = 1;
            let pattern = "file:///*/*.pdf", note = "pdf文件(本地打开123)";
            let p1 = {index: index, pattern: pattern, note: note, status: status};
            pattern = "*://*/*.pdf";
            note = "pdf文件(在线形式,以http,https,ftp等协议开头)";
            let p2 = {index: ++index, pattern: pattern, note: note, status: status};
            pattern = "*://www.chinadaily.com.cn/*";
            note = "中国日报";
            let p3 = {index: ++index, pattern: pattern, note: note, status: status};
            pattern = "/.*://english\\.sina\\.com.*/";
            note = "新浪英文版(正则匹配)";
            let p4 = {index: ++index, pattern: pattern, note: note, status: status};
            pattern = "/^(http|https)://en\\.people\\.cn.*/";
            note = "人民网英文版(正则匹配)";
            let p5 = {index: ++index, pattern: pattern, note: note, status: status};
            pattern = "https://sarabander.github.io/sicp/html/index.xhtml";
            note = "sicp在线书籍(英文)";
            let p6 = {index: ++index, pattern: pattern, note: note, status: 0};
            let initPatterns = [p1, p2, p3, p4, p5, p6];
            DatabaseUtil.savePatternsToLocal(initPatterns, function (e) {
                PageUtil.updatePatternsView(initPatterns);
                document.querySelector("#load_default").style.display = "none";
            });

        });
        /*注册删除事件*/
        document.querySelector("#table_edit_element").onclick = function (t) {
            let i = $("#table_edit_element").data("targetElement").querySelector(".url-index").textContent.match(/\d+/)[0];
            let p = $("#table_edit_element").data("targetElement").querySelector(".url-pattern").textContent;
            if (i === null || i === undefined || i === '') {
                alert("error! get index fail " + i);
                return -1;
            } else i = parseInt(i, 10);
            alert("将删除第" + i + "条规则\n" + p);
            /*取出数据并执行过滤,重建数组,修复索引*/
            browser.storage.local.get("AppConfig").then(function (items) {
                let {AppConfig} = items;
                let nn = 0; //计数器,修复数组结构的索引
                let rules = $.map(AppConfig.rules, function (e) {
                    if (e.index + 1 !== i + 1) {
                        e.index = ++nn;
                        return e;
                    } else console.log(e);
                });

                AppConfig.rules = rules;
                browser.storage.local.set({AppConfig}).then(function () {
                    //成功删除数据之后,刷新页面
                    PageUtil.updatePatternsView(AppConfig.rules);
                });
            });

        }

    },
    initPatternBtns: function () {
        document.querySelectorAll("#table_url_patterns tr button").forEach(function (e) {
            let changeStatus = function () {
                let e = this;
                let a = e.getAttribute("data-status");
                this.setAttribute("data-status", a === '0' ? "1" : "0");
                let c = e.getAttribute("data-status");
                this.textContent = c === '0' ? "已禁用" : "已启用";
                let rules = PageUtil.getUrlPatternsFromPage();
                DatabaseUtil.savePatternsToLocal(rules, function () {
                    $(e).parent().parent().removeClass("tr-pattern-" + a);
                    $(e).removeClass("btn-pattern-" + a);
                    $(e).addClass("btn-pattern-" + c);
                    $(e).parent().parent().addClass("tr-pattern-" + c);
                });
            };
            e.addEventListener("click", changeStatus);
        });
    },
    /*模块PdfConfig的注册事件*/
    initPdfConfig: function () {
        document.querySelector("#submit_pdf_config").addEventListener("click", PageHandler.savePdfConfig);
    },

    /*模块WebConfig的注册事件*/
    initWebConfig: function () {
        document.querySelector("#submit_web_config").addEventListener("click", PageHandler.saveWebConfig);
    },


    /*从页面获取数据*/
    getUrlPatternsFromPage: function () {
        let indexs = [];
        let patterns = [];
        let notes = [];

        var urlPatterns = [];

        document.querySelectorAll("#table_url_patterns tr").forEach(function (e, idx) {

            if (idx > 0) {
                let i = e.querySelector(".url-index").textContent.match(/\d+/);
                let p = e.querySelector(".url-pattern label").textContent;
                let n = e.querySelector(".url-note").textContent;
                let s = parseInt(e.querySelector("button").getAttribute("data-status"));
                if (!i) i = [-1];
                indexs.push(parseInt(i[0], 10));
                patterns.push(p);
                notes.push(n);
                urlPatterns.push(new URLPattern(i[0], p, n, s));
            }

        });
        document.querySelector("#textarea_url_patterns").value.split(/\n/).forEach(function (e) {
            if (e) {
                let i = indexs.length + 1;
                let p = e.match(/\S*/);
                let n = e.match(/\s+.*/);


                if (!p) p = [''];
                if (!n) n = [''];
                indexs.push(i);
                patterns.push(p[0]);
                notes.push(n[0]);
                urlPatterns.push(new URLPattern(i, p[0], n[0], 1));
            }
        });
        return urlPatterns;
    },
    getPdfConfigFromPage: function () {
        //以对象的形式返回
        let data = {
            pagecolor: document.querySelector("#pdf_pagecolor").value.trim().toUpperCase(),
            switch_position: document.querySelector("#pdf_switch_position").value.trim().toLowerCase(),
            switch_bgcolor: document.querySelector("#pdf_switch_bgcolor").value.trim().toUpperCase(),
            custom_css: document.querySelector("#pdf_custom_css").value,
            downloadPath: document.querySelector("#pdf_download_path").value
        };
        //空值检查,若为空,则自动设置为默认值
        /*if(!data.pagecolor||data.pagecolor==='')data.pagecolor="";//#C7EDCC
        if(!data.switch_bgcolor||data.switch_bgcolor==='')data.switch_bgcolor="";*/

        let e = data.switch_position;
        let isVaild = e === 'left' || e === 'middle' || e === 'right' || e === 'inner';
        data.switch_position = isVaild ? data.switch_position : 'inner';

        let pdfConfig = new PdfConfig(data);
        return pdfConfig;
    },
    getWebConfigFromPage: function () {
        //以对象的形式返回
        var data = {
            custom_css: document.querySelector("#web_custom_css").value
        };
        return data;
    },

    /** 更新对应的模块事件*/

    updatePatternsView: function (rules) {
        if (Object.keys(rules).length === 0) {
            document.querySelector("#table_url_patterns tbody").innerHTML = '';
            document.querySelector("#load_default").style.display = "";
            return PageUtil;
        }
        let all_tr = '';
        rules.forEach(function (item) {
            if (item.status) item.status = '1';
            let btn_txt = (item.status == 1) ? "已启用" : "已禁用";
            let td_btn = '<button type="button" class="btn-xs btn-pattern-' + item.status + '" data-status="' + item.status + '">' + btn_txt + '</button></td>';
            all_tr += '<tr class="tr-pattern-' + item.status + '"><th class="url-index">' + item.index + '</th><td class="url-pattern"><label>' + item.pattern + '</label></td><td>' + td_btn + '<td class="url-note">' + item.note + '</td></tr>';
        });
        document.querySelector("#table_url_patterns tbody").innerHTML = all_tr;

        PageUtil.initUrlPatterns();//每次更新table之后都要重新注册绑定事件
        return PageUtil;
    },


    updatePdfConfigView: function (pdfConfig) {

        if (pdfConfig) {
            document.querySelector("#pdf_pagecolor").value = pdfConfig.pagecolor;
            document.querySelector("#pdf_switch_position").value = pdfConfig.switch_position;
            document.querySelector("#pdf_switch_bgcolor").value = pdfConfig.switch_bgcolor;
            document.querySelector("#pdf_custom_css").value = pdfConfig.custom_css === "" ? "" : pdfConfig.custom_css;
            document.querySelector("#pdf_download_path").value = pdfConfig.downloadPath;

            document.querySelector("#view_pdf_pagecolor").style.backgroundColor = pdfConfig.pagecolor;
            document.querySelector("#view_switch_position").textContent = pdfConfig.switch_position;
            document.querySelector("#view_switch_bgcolor").style.backgroundColor = pdfConfig.switch_bgcolor;
        }


        return PageUtil;
    },
    updateWebConfigView: function (webConfig) {
        if (webConfig) {
            document.querySelector("#web_custom_css").value = webConfig.custom_css === "" ? "" : webConfig.custom_css;
        }
        return PageUtil;
    },

    /**通知对应的模块*/
    noticePatterns: function (notice) {
        $("#tips_patterns").text(notice).fadeIn("slow").fadeOut(3000);
        return PageUtil;
    },
    noticePdfConfig: function (notice) {
        $("#tips_pdfconfig").text(notice).fadeIn("slow").fadeOut(3000);
        return PageUtil;
    },
    noticeWebConfig: function (notice) {
        $("#tips_webconfig").text(notice).fadeIn("slow").fadeOut(3000);
        return PageUtil;
    },
};


var ManifestUtil = {
    getManifestJson: function (data) {
        return browser.runtime.getManifest();
    },
    reloadPlugin: function (manifest) {
        alert("Web-Translate扩展将重新加载,选项页面将会自动关闭!");
        browser.runtime.reload();
    }
};

/*给页面的右键菜单添加选项*/
function addContentMenu() {
    browser.contextMenus.create({
        id: "load-web-translate",
        title: "加载ICIBA取词脚本"
    });
    browser.contextMenus.create({
        id: "config-web-translate",
        title: "配置PDF-Translate"
    });
    browser.contextMenus.create({
        id: "open-local-pdf",
        title: "打开本地PDF文件"
    });

}

/*删除页面的右键菜单*/
function removeContentMenu() {
    browser.contextMenus.removeAll();
}

function initCheckBox(data) {
    let {isOpen, isTip, isRightMenu, autoLoadWhenOpenPDF, autoPopup, isHttps, autoSound, isdefaultPDFviewer, autoDownloadPDF} = data;
    $("[id='checkbox_isOpen']").bootstrapSwitch({
        state: isOpen,
        size: "mini",
        onText: "开",
        offText: "关",
        onColor: "success",
        offColor: "default",
        onSwitchChange: function (e, state) {

            let callback = function (items) {
                let {AppConfig} = items;
                AppConfig.publicConfig.isOpen = state;
                browser.storage.local.set({AppConfig});
            };

            browser.storage.local.get("AppConfig").then(callback);
        }
    });
    $("[id='checkbox_isTip']").bootstrapSwitch({
        state: isTip,
        size: "mini",
        onText: "开",
        offText: "关",
        onColor: "success",
        offColor: "default",
        onSwitchChange: function (e, state) {
            
            let callback = function (items) {
				//debugger;
				//alert(items);
                let {AppConfig} = items;
                AppConfig.publicConfig.isTip = state;
                browser.storage.local.set({AppConfig});
            };

            browser.storage.local.get("AppConfig").then(callback);
        }
    });
    $("[id='checkbox_isRightMenu']").bootstrapSwitch({
        state: isRightMenu,
        size: "mini",
        onText: "开",
        offText: "关",
        onColor: "success",
        offColor: "default",
        onSwitchChange: function (e, state) {
            state ? addContentMenu() : removeContentMenu();
            let callback = function (items) {
                let {AppConfig} = items;
                AppConfig.publicConfig.isRightMenu = state;
                browser.storage.local.set({AppConfig});
            };

            browser.storage.local.get("AppConfig").then(callback);
        }
    });
    $("[id='checkbox_autoLoadWhenOpenPDF']").bootstrapSwitch({
        state: autoLoadWhenOpenPDF,
        size: "mini",
        onText: "开",
        offText: "关",
        onColor: "success",
        offColor: "default",
        onSwitchChange: function (e, state) {
            let callback = function (items) {
                let {AppConfig} = items;
                AppConfig.publicConfig.autoLoadWhenOpenPDF = state;
                browser.storage.local.set({AppConfig});
            };

            browser.storage.local.get("AppConfig").then(callback);
        }
    });
    $("[id='checkbox_autoPopup']").bootstrapSwitch({
        state: autoPopup,
        size: "mini",
        onText: "开",
        offText: "关",
        onColor: "success",
        offColor: "default",
        onSwitchChange: function (e, state) {

            let callback = function (items) {
                let {AppConfig} = items;
                AppConfig.publicConfig.autoPopup = state;
                browser.storage.local.set({AppConfig});
            };

            browser.storage.local.get("AppConfig").then(callback);
        }
    });
    $("[id='checkbox_isHttps']").bootstrapSwitch({
        state: isHttps,
        size: "mini",
        onText: "开",
        offText: "关",
        onColor: "success",
        offColor: "default",
        onSwitchChange: function (e, state) {

            let callback = function (items) {
                let {AppConfig} = items;
                AppConfig.publicConfig.isHttps = state;
                browser.storage.local.set({AppConfig});
            };
            if (!state) {
                alert("注意！在https网站中，翻译源将强制使用https以确保成功取词！");
            }
            browser.storage.local.get("AppConfig").then(callback);
        }
    });
    $("[id='checkbox_autoSound']").bootstrapSwitch({
        state: autoSound,
        size: "mini",
        onText: "开",
        offText: "关",
        onColor: "success",
        offColor: "default",
        onSwitchChange: function (e, state) {
            let callback = function (items) {
                let {AppConfig} = items;
                AppConfig.publicConfig.autoSound = state;
                browser.storage.local.set({AppConfig});
            };

            browser.storage.local.get("AppConfig").then(callback);
        }
    });
	$("[id='checkbox_isdefaultPDFviewer']").bootstrapSwitch({
        state: isdefaultPDFviewer,
        size: "mini",
        onText: "开",
        offText: "关",
        onColor: "success",
        offColor: "default",
        onSwitchChange: function (e, state) {
            let callback = function (items) {
                let {AppConfig} = items;
                AppConfig.publicConfig.isdefaultPDFviewer = state;
                browser.storage.local.set({AppConfig});
            };

            browser.storage.local.get("AppConfig").then(callback);
        }
    });
    $("[id='checkbox_autoDownloadPDF']").bootstrapSwitch({
        state: autoDownloadPDF,
        size: "mini",
        onText: "开",
        offText: "关",
        onColor: "success",
        offColor: "default",
        onSwitchChange: function (e, state) {
            let callback = function (items) {
                let {AppConfig} = items;
                AppConfig.publicConfig.autoDownloadPDF = state;
                browser.storage.local.set({AppConfig});
            };

            browser.storage.local.get("AppConfig").then(callback);
        }
    });
	
}

/**
 Step-1:初始化所有按钮,注册对应的事件
 */



(function () {
    const isChrome = navigator.userAgent.toLowerCase().match(/chrome/) != null;
    PageUtil.initAll();
    browser.storage.local.get("AppConfig").then(function (items) {
        let {AppConfig} = items;
        PageUtil.updatePatternsView(AppConfig.rules);
        PageUtil.updatePdfConfigView(AppConfig.pdfConfig);
        PageUtil.updateWebConfigView(AppConfig.webConfig);
        initCheckBox(AppConfig.publicConfig);
    });

    $("#openpdf").click(function (e) {
        $(location).attr('href', '../resources/pdfjs-1.9.426/web/viewer.html');
    });

    $('[data-toggle="tooltip"]').tooltip();
})();

(function () {

    if ($('#btn_getSelectFromLocal')) {
        $('#btn_getSelectFromLocal').on('click', function (e) {

            browser.runtime.sendNativeMessage(
                "io.hkf.translate",
                "ping2").then(
                function (response) {
                    console.log("Received " + response);
                }, function onError(error) {
                    console.log(`Error: ${error}`);
                });

        });
    }


})();



