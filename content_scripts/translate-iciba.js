var isChrome = navigator.userAgent.toLowerCase().match(/chrome/) != null ;

var ICIBA_WORD = "";
var ICIBA_HUAYI_FLAG = 0;							//是否是本页面第一次划
var ICIBA_HUAYI_GB =0;								//是否设置固定

var ICIBA_HUAYI_ALLOW = 1;
var ICIBA_HUACI_HUA = 0;   //状态位  0:划词框消失 1：当鼠标按下时置1 2：如果此位为1的时候松开鼠标此位置2
var ICIBA_HUACI_MOVE = 0;   //状态位
var ICIBA_HUACI_pX  = 0;
var ICIBA_HUACI_pY = 0;
var isWebTranslateAlreadyExist=function () {
    const wordBox = document.querySelector("#icIBahyI-main_box");
    const pageTip = document.querySelector("#just_tips_webTranslate");
    const pageStyle = document.querySelector("#custom-style-huangkefen");
    return !!(wordBox && pageTip && pageStyle);
}();

if(isWebTranslateAlreadyExist){
    $("#just_tips_webTranslate").text("已经加载过了！").fadeIn(2000).fadeOut(3000);
}else{
	if (isChrome){
		chrome.storage.local.get("AppConfig",function (data) {
		ICIBA_ContentScript(data)});
	}else{
    browser.storage.local.get("AppConfig").then(function (data) {
	ICIBA_ContentScript(data);
    });
}
}
function ICIBA_ContentScript(storageData){
    var isChrome = navigator.userAgent.toLowerCase().match(/chrome/) != null ;
    let {AppConfig} =storageData;
    let tabUrl = null;
    if(AppConfig.env.tabInfo&&Object.keys(AppConfig.env.tabInfo).length!==0){
        tabUrl = AppConfig.env.tabInfo.url ;
    }
    let httpsOn = false ;
    if(tabUrl){
        httpsOn=/https/.test(tabUrl.toLowerCase());
    }



    /*模块1:爱词霸的取词插件*/


    /*配置:用户可自定义*/


    //pdf模式的配置
    var cfg_pdf = {
        background_color: '#C7EDCC', //页面背景色 默认 #C7EDCC
        style: '.textLayer ::-moz-selection {color:inherit;}\n.textLayer ::selection {color:inherit;}\n'  //pdf模式下修正一些样式问题,可自行修改
    };
    //web模式的配置
    var cfg_web = {
        style: ''
    };
    //取词开关的配置
    var cfg_switch = {
        position: 'inner', // 默认inner 可取 left  middle right inner
        background_color: '#C7EDCC'
    };


    if(AppConfig.pdfConfig){
        let p=AppConfig.pdfConfig;
        cfg_pdf.background_color=p.pagecolor;
        cfg_pdf.style=p.custom_css?(cfg_pdf.style+' '+p.custom_css):cfg_pdf.style;
        cfg_switch.position=p.switch_position?p.switch_position:'inner';
        cfg_switch.background_color=p.switch_bgcolor?p.switch_bgcolor:'#C7EDCC';
    }

    if(AppConfig.webConfig&&AppConfig.webConfig.custom_css){
        cfg_web.style+=AppConfig.webConfig.custom_css;
    }



    /*
    *
    * Step-1: 检测当前页面是否是PDF
    *
    * */


    /*
        判断当前浏览的是PDF还是普通网页
        说明:这里添加了针对chrome的逻辑判断代码,判断逻辑为检测指定的pdf.js的元素是否存在,所以要求在页面加载完成之后执行,才能生效
    */
    var currentView = 'web';  //可选值 web  pdf  默认为web window.location.href.toLowerCase().match(/\.pdf$/));//,
	//alert($('#secondaryToolbarButtonContainer').length > 0);
    if (window.location.href.toLowerCase().match(/\.pdf$/) || $('#secondaryToolbarButtonContainer').length > 0) {
		
        currentView = 'pdf';
    } else {
        currentView = 'web';
    }




    /*
    *
    * Step-2: 取词插件的开关
    *
    * */

    var div_switch = document.createElement("div");
    div_switch.setAttribute("id", "Jihuajiyi");
    div_switch.setAttribute("style", "background-color:" + cfg_switch.background_color); //开关的背景色也设为苹果绿

    // var switch_position =(typeof y_sp=='undefined'||y_sp=='')?'inner':y_sp ;
    if (currentView == 'pdf'&&$("#Jihuajiyi").length<=0) {
        //浏览模式为pdf时,嵌入取词开关
        if (cfg_switch.position == 'left') {
            $("#toolbarViewerLeft").prepend(div_switch);
        } else if (cfg_switch.position == 'middle') {
            $("#toolbarViewerMiddle").prepend(div_switch);
        } else if (cfg_switch.position == 'right') {
            $("#toolbarViewerRight").prepend(div_switch);
        } else {
            $("#secondaryToolbar").append(div_switch);
        }
    } else if (currentView == 'web'&&$("#Jihuajiyi").length<=0) {
        //浏览模式为web时,嵌入取词开关
        div_switch.style.display="inline-block";
        $("body").append(div_switch);
    }


    /*
    *
    * Step-3: 下面这些是iciba官方公布的取词插件的js代码(核心代码),我做了一些调整,以便能够适应不同的网站
    *
    *
    * */

    var iciba_huaci_url_new =(httpsOn||AppConfig.publicConfig.isHttps?"https":"http")+"://open.iciba.com/huaci_v3/";
    var ICIBA_HUAYI_Str = '';

    ICIBA_HUAYI_Str += '<div id="icIBahyI-yi" style="display:none"></div>';
    ICIBA_HUAYI_Str += '<div id="icIBahyI-main_box" class="icIBahyI-main_box" style="display:none">';
    ICIBA_HUAYI_Str += '	<div class="icIBahyI-main_title" id="icIBahyI-main_title" >';
    ICIBA_HUAYI_Str += '        <i></i>';
    ICIBA_HUAYI_Str += '    	<a  id="icIBahyI-gb" class="icIBahyI-gb" title="关闭"></a>';
    ICIBA_HUAYI_Str += '        <a  id="icIBahyI-dq" class="icIBahyI-dq2" title="点击固定结果"></a>';
    ICIBA_HUAYI_Str += '       即划即译';
    ICIBA_HUAYI_Str += '       <div class="icIBahyI-sz_list" id="icIBahyI-sz_list">';
    ICIBA_HUAYI_Str += '        	<a>关闭即划即译</a>';
    ICIBA_HUAYI_Str += '            <a  target="_blank">反馈</a>';
    ICIBA_HUAYI_Str += '            <a  style="border:none;" target="_blank">帮助</a>';
    ICIBA_HUAYI_Str += '            <span class="icIBahyI-j icIBahyI-tl"></span>';
    ICIBA_HUAYI_Str += '            <span class="icIBahyI-j icIBahyI-tr"></span>';
    ICIBA_HUAYI_Str += '            <span class="icIBahyI-j icIBahyI-bl"></span>';
    ICIBA_HUAYI_Str += '            <span class="icIBahyI-j icIBahyI-br"></span>';
    ICIBA_HUAYI_Str += '        </div>';
    ICIBA_HUAYI_Str += '    </div>';
    ICIBA_HUAYI_Str += '    <div class="icIBahyI-search">';
    ICIBA_HUAYI_Str += '        <div class="icIBahyI-search-w clearfix">';
    ICIBA_HUAYI_Str += '            <input id="ICIBA_HUAYI_input" style="border:none" type="text" />';
    ICIBA_HUAYI_Str += '            <a id="icIBahyI-sear" class="icIBahyI-sear"  >搜索</a>';
    ICIBA_HUAYI_Str += '            <a id="hy_clear" class="hy_clear"></a>';
    ICIBA_HUAYI_Str += '        </div>';
    ICIBA_HUAYI_Str += '    </div>';
    if(httpsOn&&!AppConfig.publicConfig.isHttps){
        ICIBA_HUAYI_Str += '    <div class="icIBahyI-loading" id="loading"><div></div><p style="color: black;">https网站必须开启"https取词"功能</p></div>';
    }else{
        ICIBA_HUAYI_Str += '    <div class="icIBahyI-loading" id="loading"><div></div><p id="loadingMsg">无法加载？点<a href="https://open.iciba.com" target="_blank" style="color:#6699CC">这里</a>并确保能正常访问</p></div>';
    }
    ICIBA_HUAYI_Str += '    	<div class="icIBahyI-main_cont" id="icIBahyI-main_cont"></div>';
    ICIBA_HUAYI_Str += ' <div class="icIBahyI-CB" id="icIBahyI-scbiframe" style="display:none"></div>';
    ICIBA_HUAYI_Str += '<div id="ICIBA_TOO_LONG"  style="height:150px;display:none;" class="icIBahyI-footer ICIBA_TOO_LONG">您划取的内容太长，建议您去爱词霸<a href="https://fy.iciba.com">翻译</a>页面。</div>';
    ICIBA_HUAYI_Str += '<div class="icIBahyI-down"></div>';
    ICIBA_HUAYI_Str += '</div>';


    ICIBA_HUAYI_Str += '<audio style="display: none" id="my_media_player"></audio>';


    ICIBA_HUAYI_Str += ' <div class="icIBahyI-USER_LOGIN" id="icIBahyI-USER_LOGIN" style="display:none"></div>';




    $("body").append(""+ICIBA_HUAYI_Str);
    $("#testbackgroundpage").append(""+ICIBA_HUAYI_Str);





    /**
     *
     * Step-4: 载入核心代码2
     *
     * */




    /**工具类:String*/

    //删除前后空格
    String.prototype.Trim = function(){
        return this.replace(/(^\s*)|(\s*$)/g, "");
    };


    /**功能-1: Cookie管理功能*/


    /** 功能-2:获取当前选中的文本*/
    function ICIBA_HUAYI_funGetSelectTxt() {
        let txt = "";
        let isDecode = false ;
        if(document.selection) {
            txt = document.selection.createRange().text;
        } else {
            txt = document.getSelection();
        }
        let ICIBA_WORD = txt.toString().Trim();
        // console.log("原始文本为",ICIBA_WORD,"长度",ICIBA_WORD.length);
        /*解码算法1*/
        let decodeTxt ='';
        for(let i=0;i<ICIBA_WORD.length;i++){
            // console.log(String.fromCharCode(ICIBA_WORD.codePointAt(i)-3));
            decodeTxt+=(String.fromCharCode(ICIBA_WORD.codePointAt(i)-3));
        }
        let decodeTxt1 = '' ;
        decodeTxt1 = ICIBA_WORD.replace(/[a-z]/g,function (w) {
            return String.fromCharCode(w.toString().codePointAt(0)-3);//解码正文的小写字母
        });
        decodeTxt1 = decodeTxt1.replace(/[$-=]/g,function (w) {
            // console.log('处理大写(前):',w,w.toString().codePointAt(0));
            // console.log('处理大写(后):',String.fromCharCode(w.toString().codePointAt(0)+29),w.toString().codePointAt(0)+29);
            return String.fromCharCode(w.toString().codePointAt(0)+29);//解码正文的大写字母
        });
        // console.log('算法1解码得',decodeTxt1);
        if(isDecode) {ICIBA_WORD = decodeTxt1;}
        return ICIBA_WORD;
    }

    /**
     * 功能-3:获取文本对象的相对浏览器的坐标
     */
    //数据结构
    function ICIBA_HUAYI_CPos(x,y){
        this.x = x;
        this.y = y;
    }
    //获取对象的坐标
    function ICIBA_HUAYI_GetObjPos(ATarget)
    {
        let target = ATarget;
        let pos = new ICIBA_HUAYI_CPos(target.offsetLeft,target.offsetTop);

        target = target.offselettParent;

        while(target)

        {
            pos.x += target.offsetLeft;
            pos.y += target.offsetTop;
            target = target.offsetParent
        }
        return pos;
    }

    //获取当前鼠标的坐标
    function getMouseCoords(ev)
    {
        return {
            x:ev.pageX,
            y:ev.pageY
        };
    }


    /** 事件-1: 查询按钮*/




    /** 注册document事件: 重新注册Document的鼠标down,move,up,dblclick事件*/

    var eleContainer = eleContainer || document;

    /* 引入状态管理器，管理查词组件的状态，比如各个div的显示状态，是否固定等，但并没有接管所有状态,比如相对位置x，y*/
    var StatusManager  = {
        getIcibaStatusManager:function () {
            let mainBox = $(".icIBahyI-main_box") ;
            let dict=$(".icIBahyI-main_cont");
            let loading=$(".icIBahyI-loading");
            let loadingImg=$("#loading > div");
            let mainTitle=$('.icIBahyI-main_title');
            let searchBar=$('.icIBahyI-search');
            let statusBar=$('.icIBahyI-down');
            let ICIBA_TOO_LONG=$('.ICIBA_TOO_LONG');
            this.setStatus = function (state) {
                if(state==="loading"){
                    //如果超时，默认300ms,则显示等待图片
                    let timeOut;
                    if(AppConfig.publicConfig.timedOutForWaiting){
                        timeOut = AppConfig.publicConfig.timedOutForWaiting;
                    }
                    timeOut = typeof timeOut === 'number'?timeOut:300;

                    setTimeout(function () {
                        const display=$("#loadingMsg").css("display");
                        const visibility=$("#loadingMsg").css("visibility");
                        const show = display==="none"||(display==="block"&&visibility==="hidden");
                        if(show){
                            loading.css({display:"block",visibility:"visible"});
                            loadingImg.css({display:"block",visibility:"visible"});
                            $("#loadingMsg").html("加载中");
                        }
                    },timeOut);
                    //使光标失去焦点
                    $("#ICIBA_HUAYI_input").blur();
                }else if(state==='loadingByImgOnly'){
                    $(mainBox,mainTitle,searchBar,loading,loadingImg,statusBar).css({display:"block",visibility:"hidden"});
                    //如果超时，默认300ms,则显示等待图片
                    let timeOut;
                    if(AppConfig.publicConfig.timedOutForWaiting){
                         timeOut = AppConfig.publicConfig.timedOutForWaiting;
                    }
                    timeOut = typeof timeOut === 'number'?timeOut:300;

                    setTimeout(function () {
                        const display=$("#icIBahyI-main_box").css("display");
                        const visibility=$("#icIBahyI-main_box").css("visibility");
                        const show = display==="none"||(display==="block"&&visibility==="hidden");
                        if(show){
                            $(mainBox,mainTitle,searchBar,loading,statusBar).css({display:"block",visibility:"hidden"});
                            loadingImg.css({display:"block",visibility:"visible"});
                        }
                    },timeOut);

                    ICIBA_TOO_LONG.hide();
                }else if(state === 'querySuccess'){
                    $(mainBox,mainTitle,searchBar,dict,statusBar).css({display:"block",visibility:"visible"});
                    $(dict).show();
                    $(loading,loadingImg).hide();
                    const txt = ICIBA_HUAYI_funGetSelectTxt() ;
                    if(!txt) $("#ICIBA_HUAYI_input").focus();
                }else if(state === 'queryFail'){
                    $(mainBox,mainTitle,searchBar,statusBar,loading,loadingImg).css({display:"block",visibility:"visible"});
                    $(dict).hide();
                    const txt = ICIBA_HUAYI_funGetSelectTxt() ;
                    if(!txt) $("#ICIBA_HUAYI_input").focus();
                }else if(state === 'hidden'){
                    mainBox.hide();
                }
            };



            return this;
        }

    }

    /** 定义鼠标按下,鼠标松开,鼠标移动时的事件*/

    function ICIBA_HUACI_MDown(event) {//事件会在鼠标按键被按下时发生

        var obj =  document.getElementById("icIBahyI-main_box");
        document.getElementById("icIBahyI-yi").style.display="none";
        ICIBA_HUACI_Obj = obj.parentNode;

        var mousePos = getMouseCoords(event);
        var obj_left_x = ICIBA_HUAYI_GetObjPos(obj)["x"];
        var obj_left_y = ICIBA_HUAYI_GetObjPos(obj)["y"];

        ICIBA_HUACI_pX = mousePos.x - obj_left_x;
        ICIBA_HUACI_pY = mousePos.y - obj_left_y;


    }
    function ICIBA_HUACI_MMove(event) {
        //	alert(1);
        event = event||window.event;
        document.getElementById("icIBahyI-main_title").style.cursor="move";
        var obj =  document.getElementById("icIBahyI-main_box");
        var mousePos = getMouseCoords(event);

        obj.style.left=mousePos.x-ICIBA_HUACI_pX + "px";
        obj.style.top=mousePos.y-ICIBA_HUACI_pY + "px";
    }
    function ICIBA_HUACI_MUp(event) {
        var obj =  document.getElementById("icIBahyI-main_box");
        document.getElementById("icIBahyI-main_title").style.cursor="default";
        ICIBA_HUACI_Obj = obj.parentNode;
        if(ICIBA_HUACI_Obj){
            if (window.event && ICIBA_HUACI_Obj.releaseCapture) {ICIBA_HUACI_Obj.releaseCapture()};
            ICIBA_HUACI_Obj=null;
        }

    }
    let onmousedown = function(ev){
        ev= ev || window.event;

        if($("#icIBahyI-main_box").has(ev.target).length===0){//鼠标不在该取词div中
            if(!ICIBA_HUAYI_GB){
                StatusManager.getIcibaStatusManager().setStatus("hidden");
            }
        }
        var obj =  document.getElementById("icIBahyI-main_box");
        var obj_title =  document.getElementById("icIBahyI-main_title");
        var mousePos = getMouseCoords(ev);

        var obj_left_x = ICIBA_HUAYI_GetObjPos(obj)["x"];
        var obj_left_y = ICIBA_HUAYI_GetObjPos(obj)["y"];
        var obj_right_x = obj_left_x + obj.scrollWidth;
        var obj_right_y = obj_left_y + obj.scrollHeight;
        var obj_title_right_x = obj_left_x + obj_title.scrollWidth;
        var obj_title_right_y = obj_left_y + obj_title.scrollHeight;

        if(obj.style.display == "none" || !(mousePos.x > obj_left_x && mousePos.x<obj_right_x && mousePos.y>obj_left_y && mousePos.y<obj_right_y )){
            ICIBA_HUACI_HUA = 1;
        }
        if(obj.style.display == "block" && (mousePos.x > obj_left_x && mousePos.x<obj_title_right_x && mousePos.y>obj_left_y && mousePos.y<obj_title_right_y)){
            ICIBA_HUACI_MOVE = 1;
            ICIBA_HUACI_MDown(ev);
        }

    };
    let onmousemove = function(ev){
        ev= ev || window.event;
        if(ICIBA_HUACI_MOVE > 0){
            //		ICIBA_HUACI_MOVE = 2;
            ICIBA_HUACI_MMove(ev);
        }else{
            if(ICIBA_HUACI_HUA == 1){
                ICIBA_HUACI_HUA = 2;
            }
        }
    }
    let onmouseup = function(ev){
        var yiObj = document.getElementById("icIBahyI-yi")
        var obj =  document.getElementById("icIBahyI-main_box");
        ev= ev || window.event;
        var mousePos = getMouseCoords(ev);
        var obj_left_x = ICIBA_HUAYI_GetObjPos(obj)["x"];
        var obj_left_y = ICIBA_HUAYI_GetObjPos(obj)["y"];
        var obj_right_x = obj_left_x + obj.scrollWidth;
        var obj_right_y = obj_left_y + obj.scrollHeight;
        var left = mousePos.x;
        var top = mousePos.y;
        if(ICIBA_HUAYI_ALLOW && ICIBA_HUACI_HUA == 2){
            var dict=document.getElementById('icIBahyI-main_cont');
            var loading=document.getElementById('loading');
            var ICIBA_TOO_LONG=document.getElementById('ICIBA_TOO_LONG');
            if(obj.style.display == "none" || !(mousePos.x > obj_left_x && mousePos.x<obj_right_x && mousePos.y>obj_left_y && mousePos.y<obj_right_y)){
                var txt=ICIBA_HUAYI_funGetSelectTxt();
                if (txt && txt.length<1000) {
                    document.getElementById("ICIBA_HUAYI_input").value=txt;
                    let i_s=iciba_huaci_url_new+'dict.php?word=';
                    loading.style.display = "block";
                    dict.style.display = "none";
                    if(!ICIBA_HUAYI_GB){
                        obj.style.left = left + "px";
                        obj.style.top = top + "px";
                        if(ICIBA_HUAYI_FLAG){
                            ICIBA_HUAYI_mm(i_s,txt,ev);
                            ICIBA_TOO_LONG.style.display = "none";
                            obj.style.display = "block";
                        }else{
                            yiObj.style.display = "block";
                            yiObj.style.left = left + "px";
                            yiObj.style.top = top + "px"
                        }
                    }else{
                        ICIBA_HUAYI_mm(i_s,txt,ev);
                        ICIBA_TOO_LONG.style.display = "none";
                        obj.style.display = "block";
                    }
                    yiObj.onclick=function(){
                        yiObj.style.display = "none";
                        dict.style.display = "block";
                        ICIBA_HUAYI_mm(i_s,txt,ev);
                        ICIBA_TOO_LONG.style.display = "none";
                        obj.style.display = "block";
                        ICIBA_HUAYI_FLAG = 1;
                    }
                    return i_s;
                }else if(txt && txt.length>=1000){
                    yiObj.style.display = "block";
                    yiObj.style.left = left + "px";
                    yiObj.style.top = top + "px"
                    if(!ICIBA_HUAYI_GB){
                        obj.style.left = left + "px";
                        obj.style.top = top + "px";
                    }
                    yiObj.onclick=function(){
                        loading.style.display = "none";
                        dict.innerHTML='<div id="ICIBA_TOO_LONG" style="height:150px;padding-top:10px;padding-left:10px;" class="footer">您划取的内容太长，建议您去<a href="http://fy.iciba.com" target="_blank">爱词霸翻译</a>页面。</div>';
                        obj.style.display = "block";
                        yiObj.style.display = "none";
                    }

                }
                else {
                    yiObj.style.display = "none";
                    ICIBA_TOO_LONG.style.display = "none";
                    if(!ICIBA_HUAYI_GB){
                        StatusManager.getIcibaStatusManager().setStatus("hidden");
                    }

                }
            }
        }else if(!(mousePos.x > obj_left_x && mousePos.x<obj_right_x && mousePos.y>obj_left_y && mousePos.y<obj_right_y)){
            yiObj.style.display = "none";
            if(!ICIBA_HUAYI_GB){
                obj.style.position = "absolute";
                obj.style.display = "none";
            }
            //		ICIBA_HUAYI_FLAG = 0;
        }
        if(ICIBA_HUACI_MOVE == 1){
            ICIBA_HUACI_MUp(ev);
        }
        var scbiframe =  document.getElementById("icIBahyI-scbiframe");
        scbiframe.style.display = "none";
        ICIBA_HUACI_MOVE = 0;
        ICIBA_HUACI_HUA = 0;
    };
    let ondblclick = function(ev){
        let obj =  document.getElementById("icIBahyI-main_box");

        ev= ev || window.event;
        let mousePos = getMouseCoords(ev);
        let obj_left_x = ICIBA_HUAYI_GetObjPos(obj)["x"];
        let obj_left_y = ICIBA_HUAYI_GetObjPos(obj)["y"];
        let obj_right_x = obj_left_x + obj.scrollWidth;
        let obj_right_y = obj_left_y + obj.scrollHeight;

        let left = mousePos.x;
        let top = mousePos.y+10;
        if(ICIBA_HUAYI_ALLOW){
            let dict=document.getElementById('icIBahyI-main_cont');
            let loading=document.getElementById('loading');
            let ICIBA_TOO_LONG=document.getElementById('ICIBA_TOO_LONG');
            if(obj.style.display == "none" || !(mousePos.x > obj_left_x && mousePos.x<obj_right_x && mousePos.y>obj_left_y && mousePos.y<obj_right_y)){
                var txt=ICIBA_HUAYI_funGetSelectTxt();
                if (txt && txt.length<1000) {
                    document.getElementById("ICIBA_HUAYI_input").value=txt;
                    let i_s=iciba_huaci_url_new+'dict.php?word=';
                    if(!ICIBA_HUAYI_GB){
                        obj.style.left = ev.pageX + "px";
                        obj.style.top = ev.pageY +10+ "px";
                        $("#testbackgroundpage").attr("style","position:fixed;color: green;top: 30%;left: 5px;z-index: 700;font-weight: 900;")
                            .text("sssssss").fadeIn(2000).fadeOut(4000);
                    }
                    ICIBA_HUAYI_mm(i_s,txt,ev);
                }else if(txt && txt.length>=1000){
                    if(!ICIBA_HUAYI_GB){
                        obj.style.left = left + "px";
                        obj.style.top = top + "px"
                    }
                    loading.style.display = "none";
                    dict.innerHTML='<div id="ICIBA_TOO_LONG" style="height:150px;padding-top:10px;padding-left:10px;" class="footer">您划取的内容太长，建议您去<a href="http://fy.iciba.com"  target="_blank">爱词霸翻译</a>页面。</div>';
                    obj.style.display = "block";
                }
                else {
                    ICIBA_TOO_LONG.style.display = "none";
                    if(!ICIBA_HUAYI_GB){
                        obj.style.display = "none";
                    }
                }
            }
        }
        let scbiframe =  document.getElementById("icIBahyI-scbiframe");
        scbiframe.style.display = "none";
    };


    $(eleContainer).mousedown(onmousedown);
    $(eleContainer).mousemove(onmousemove);
    $(eleContainer).mouseup(onmouseup);
    $(eleContainer).dblclick(ondblclick);

    /* 获取当前选中文字的父元素*/
    function getSelectionBoundaryElement(isStart) {
        let range, sel, container;
        if (document.selection) {
            range = document.selection.createRange();
            range.collapse(isStart);
            return range.parentElement();
        } else {
            sel = window.getSelection();
            if (sel.getRangeAt) {
                if (sel.rangeCount > 0) {
                    range = sel.getRangeAt(0);
                }
            } else {
                // Old WebKit
                range = document.createRange();
                range.setStart(sel.anchorNode, sel.anchorOffset);
                range.setEnd(sel.focusNode, sel.focusOffset);

                // Handle the case when the selection was selected backwards (from the end to the start in the document)
                if (range.collapsed !== sel.isCollapsed) {
                    range.setStart(sel.focusNode, sel.focusOffset);
                    range.setEnd(sel.anchorNode, sel.anchorOffset);
                }
            }

            if (range) {
                container = range[isStart ? "startContainer" : "endContainer"];

                // Check if the container is a text node and return its parent if so
                return container.nodeType === 3 ? container.parentNode : container;
            }
        }
    }



    /**
     * 向后台发起单词翻译查询
     *
     * */


    browser.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if(request.status){
                const status  = request.status ;
                if(status ==='success' && request.WordResult){
                    $("#icIBahyI-main_cont").html(request.WordResult);
                    StatusManager.getIcibaStatusManager().setStatus("querySuccess");
                    $(".icIBahyI-eg a").each(function () {
                        /**发音代码:
                         修改by huangkefen,使用html5的audio标签来播放声音,这里改成使用后台网页来播放声音
                         */
                        let evStr = AppConfig.publicConfig.autoSound?"mouseenter":"click";
                        let srcUrl  = this.getAttribute("data-src").match(/http.*\.mp3/)[0].replace(/http:/,"https:");
                        $(this).on(evStr,function () {
                            browser.runtime.sendMessage({"action":"playAudio","url": srcUrl });
                        });
                        $(this).removeAttr("data-src").removeAttr("href");
                    });
                    // sendResponse({"responseFromContext":"已经收到您发来的数据！"});
                }else if(status==='timeout'){
                    let timeoutTxt =request.timeout?("请求超时："+request.timeout/1000+'秒'):'';
                    let timeoutDiv = "<p id=\"loadingMsg\">"+timeoutTxt+" 点<a href=\"https://open.iciba.com\" target=\"_blank\" style=\"color:#6699CC\">这里</a>并确保能正常访问</p>"
                    $("#loadingMsg").html(timeoutDiv);
                    StatusManager.getIcibaStatusManager().setStatus("queryFail");
                }else if(status==="error"){
                    let errorDiv = "<p id=\"loadingMsg\">网络错误!点<a href=\"https://open.iciba.com\" target=\"_blank\" style=\"color:#6699CC\">这里</a>并确保能正常访问</p>"
                    $("#loadingMsg").html(errorDiv);
                    StatusManager.getIcibaStatusManager().setStatus("queryFail");
                }

            }

        }
    );
    function ICIBA_HUAYI_mm(path,txt,event){
        let url = path+encodeURIComponent(txt);
        //向后台请求数据前的状态，根据事件类型进入不同的组件状态
        if(event.type==="dblclick"){
            if(!ICIBA_HUAYI_GB){
                StatusManager.getIcibaStatusManager().setStatus("loadingByImgOnly");
            }
        }else{
            StatusManager.getIcibaStatusManager().setStatus("loading");
        }
        //使用api向后台请求数据并监听结果，根据结果数据来刷新相应的组件状态
        //监听函数在取词脚本加载时注册，所以这段代码存在对监听函数的依赖，若应用设计有依赖关系图或数据结构，可在此写入并执行维护
        browser.runtime.sendMessage(
            {
                "action":"getWordResult",
                "url":url
            }
        ).catch(function (error) {
            console.log(error);
        });

    }



    $("#icIBahyI-sear").on("click",function (event) {
        let selected = $("#ICIBA_HUAYI_input").val();
        if(selected){
            ICIBA_HUAYI_mm(iciba_huaci_url_new+'dict.php?word=',selected,event);
        }

    });

    $(window).keydown(function(event){
        switch (event.keyCode){
            case 13:
                ICIBA_HUAYI_mm(iciba_huaci_url_new+'dict.php?word=',$("#ICIBA_HUAYI_input").val(),event);
                break;
        }
    });



    /*开始关闭即划即译功能*/
    function ICIBA_HUAYI_kg(){
        let iKg=document.getElementById("Jihuajiyi");
        ICIBA_HUAYI_ALLOW=1;

        //开关
        let switchFlag = '';
        switchFlag += '<div class="iciba_switch_bar">';
        if(ICIBA_HUAYI_ALLOW){
            switchFlag +=   '<div class="iciba_switch_bar_wrap on" id="iciba_switch_bar_wrap">';
        } else {
            switchFlag +=   '<div class="iciba_switch_bar_wrap off" id="iciba_switch_bar_wrap">';
        }
        switchFlag +=			'<span class="iciba_switch_on">ON</span><span class="iciba_switch_slider"></span><span class="iciba_switch_off">OFF</span>';
        switchFlag +=		'</div>';
        switchFlag += '</div>';
        switchFlag += '<i class="iciba_switch-icon"></i><span class="iciba_switch_txt"> 即划即译</span>';


        if(iKg)iKg.innerHTML = switchFlag;
        let kg = document.getElementById('iciba_switch_bar_wrap');

        if(kg)kg.onclick = function (){	
            if(ICIBA_HUAYI_ALLOW){
                ICIBA_HUAYI_ALLOW=0;
                let yiObj = document.getElementById("icIBahyI-yi");
                yiObj.style.display = "none";
                let obj = document.getElementById("icIBahyI-main_box");
                obj.style.display = "none";
                ICIBA_HUAYI_FLAG  = 0;
                ICIBA_HUAYI_GB = 0;
                document.getElementById("icIBahyI-dq").className = "icIBahyI-dq2"

                kg.className="iciba_switch_bar_wrap off";
                kg.title="点击开启即划即译";
                let customStyleElement = document.querySelector("#custom-style-huangkefen") ;
                if(customStyleElement) customStyleElement.remove();

            }else{
                ICIBA_HUAYI_ALLOW=1;
                kg.className="iciba_switch_bar_wrap on";
                kg.title="点击关闭即划即译";
                loadCustomStyle();
            }
        }
    }
    ICIBA_HUAYI_kg();
    /*关闭按钮的click事件*/
    document.getElementById("icIBahyI-gb").onclick=function(){
        ICIBA_HUAYI_FLAG = 0;
        ICIBA_HUAYI_GB = 0;
        document.getElementById("icIBahyI-dq").className = "icIBahyI-dq2";
        document.getElementById("icIBahyI-main_box").style.display="none";
    };
    /*固定按钮的click事件*/
    document.getElementById("icIBahyI-dq").onclick=function(ev){
        ev= ev || window.event;
        var obj =  document.getElementById("icIBahyI-main_box");
        var mousePos = getMouseCoords(ev);
        var top = mousePos.y+10;
        if(ICIBA_HUAYI_GB){
            obj.style.top = top+"px";
            this.className = "icIBahyI-dq2"
            obj.style.position = "absolute";
            ICIBA_HUAYI_GB = 0;
        }else{
            obj.style.top = top - document.documentElement.scrollTop +"px";
            obj.style.position = "fixed";
            this.className = "icIBahyI-dq";
            ICIBA_HUAYI_GB = 1;

        }
    };
    /*清空按钮的click事件*/
    document.getElementById("hy_clear").onclick = function(e){
        document.getElementById("ICIBA_HUAYI_input").value = '';
    };












    /*
    *
    * Step-5: 自定义的pdf样式,如页面背景色等.硬编码
    *
    * */
    function loadCustomStyle(){
        if (currentView === 'pdf') {
            $("body").append('<style id="custom-style-huangkefen" type="text/css">' + cfg_pdf.style + '.textLayer {background-color:' + cfg_pdf.background_color + '}</style>');
        } else {
            $("body").append('<style id="custom-style-huangkefen" type="text/css">' + cfg_web.style + '</style>');

        }
    }

    loadCustomStyle();

    /*
        *
        * Step-6: 是否弹出提示
        *
        * */
    if(AppConfig.publicConfig&&AppConfig.publicConfig.isTip){
        $("body").append("<div id='just_tips_webTranslate' class='tips_webTranslate'></div>");
        $("#just_tips_webTranslate").attr("style","position:fixed;color: green;top: 30%;left: 5px;z-index: 700;font-weight: 900;")
            .text("取词插件加载成功").fadeIn(2000).fadeOut(3000);
    }


}