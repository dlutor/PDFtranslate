

(function () {
	/*
    document.getElementById("a_openPDF").addEventListener('click',function (event) {
        if(event.target===this){document.getElementById("openPDF").click();}
    },false);
    document.getElementById("openPDF").addEventListener('click',function (event) {
        if(event.target===this){
            chrome.tabs.create({url: "/content_scripts/pdfjs/web/viewer.html"});
        }
    },false);*/
    document.getElementById("openConfigPage").addEventListener('click', function () {
        chrome.runtime.openOptionsPage();
    },false);
    document.getElementById("loadIcibaScript").addEventListener('click', function () {
        chrome.runtime.sendMessage({"action": "loadIcibaScript" });
    },false);
})();