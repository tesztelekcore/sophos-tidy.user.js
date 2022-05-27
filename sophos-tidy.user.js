// ==UserScript==
// @name      Sophos Tidy
// @version   1.7.6
// @grant     unsafeWindow
// @grant     GM_addStyle
// @author    Daniel Agocs
// @match     https://*/webconsole/webpages/index.jsp*
// @run-at    document-end
// @updateURL
// ==/UserScript==
//
// Changelog:
// 1.7.6: Hide Sophos Assistant
// 1.7.5: Max 1000 lines per page to avoid ui hang
// 1.7: Keep session alive, better fix for unwanted scrolling, improved styles
// 1.6: Dirty fix for scroll issue in long lists
// 1.5: Fix annoying scroll on hover tooltip circles
// 1.4: Show request errors
// 1.3: Fix firewall groups
// 1.2: Generic pagination maximizer
// 1.1: Included styles, auto-update
// 1.0: Initial release: wide page style, disable some ellipsizing
//

GM_addStyle(`
/* Main block widening */
body {overflow-y: scroll;}
#topbar {width: calc(100% - 180px) !important}
#wrapper.cp-wrapper {width: unset !important; max-width: unset !important;}
#tabs-width {max-width: 100% !important}
.tab-header {max-width: 100% !important}
.cp-wrapper nav.tabs-nav {max-width: 100% !important}

/* Text ellipsize off */
.ellipsisForspan {white-space: normal !important}
.text-ellipces {white-space: normal !important; width: unset !important;}

/* Text wrap */
.yui-dt-liner {white-space: normal !important; min-width: 90% !important}
.yui-dt {verflow-x: unset !important; overflow-y: unset !important; max-height: unset !important; height: unset !important}
.cp-wrapper .customExpandableTable .two-line-ellipses {display:block !important}
.two-line-ellipses {display:block !important}

/* Inline edit form not to be so wide, summary good */
#inlinePopup {width: 80% !important;}
.cp-wrapper .sophos-ruleNav-one {left: 83% !important;}
.firewallRuleAddEditForm .cp-sec-content {padding: 15px 0px 0px 15px !important;}

/* Firewall group rules not to collapse */
.fwGrpDesc {
    height: unset !important;
}

/* Firewall group sub-rule no ellipsis */
.fg-rule-name a {
    overflow: visible !important;
}

/* Firewall tooltip name no ellipsis */
.fw-tp-name {
    overflow: visible !important;
}

/* Service name in service list */
.yui-dt-col-servicename {
    width: 250px;
}

/* Hide Sophos Assistant */
#_widget_wfx_ {
    display: none !important;
}
`);

// Disable scrollIntoView function
HTMLElement.prototype.scrollIntoView = function() {};

// Show errors
(function(open) {
    unsafeWindow.XMLHttpRequest.prototype.open = function() {
        this.addEventListener("readystatechange", function() {
            if(this.readyState == 4){
                try {
                    let resp = JSON.parse(this.response);
                    if(resp.status != 200 && resp.opcodeMessage != "") {
                        setTimeout(function(){ //Main code also calls this, so we should wait a bit
                            unsafeWindow.Cyberoam.setStatusBarMessage(resp.opcodeMessage, resp.status);
                        }, 500);
                    }
                } catch {}
            }
        }, false);
        open.apply(this, arguments);
    };
})(unsafeWindow.XMLHttpRequest.prototype.open);

// Fix annoying scroll on hover
(function(showTooltip) {
    unsafeWindow.Cyberoam.showTooltip = function() {
        let scrollTop = $(document).scrollTop();
        arguments[1].offsetTop -= 1;
        showTooltip.apply(this, arguments);
        $(document).scrollTop(scrollTop);
    };
})(unsafeWindow.Cyberoam.showTooltip);

// Repeating tweaks
setInterval(function() {
  //pagination max
  for(let item in unsafeWindow)
    if(item.indexOf('paginator') != -1)
      if(unsafeWindow[item].getRowsPerPage)
        if(unsafeWindow[item].getRowsPerPage() != unsafeWindow[item].getTotalRecords())
        {
          unsafeWindow[item].setRowsPerPage(1000);
        }

  //rules->firewall
  for(let item of document.getElementsByClassName('two-line-ellipses'))
    if(item.title) {
      if(item.classList.contains('group-description'))
        item.innerHTML = item.title;
      else
        item.innerHTML = item.title.replaceAll(" , ", "<br>").replaceAll(" ,", "<br>").replaceAll(",", "<br>");
      item.title="";
    }

  //rules->nat
  for(let item of document.getElementsByClassName('ellipsisForspan'))
    if(item.title) {
      item.innerHTML = item.title.replaceAll(" , ", "<br>").replaceAll(" ,", "<br>").replaceAll(",", "<br>");
      item.title="";
    }

  //rules firewall name
  for(let item of document.getElementsByClassName('fg-rule-name'))
    if(item.childElementCount == 0) {
      if(item.parentElement)
        if(item.parentElement.parentElement)
          if(item.parentElement.parentElement.attributes)
            if(item.parentElement.parentElement.attributes['name'])
              item.childNodes[0].textContent = item.parentElement.parentElement.attributes['name'].value;
    } else
      item.childNodes.forEach(function(it){
        if(it.parentNode.title) {
          it.innerHTML = it.parentNode.title
      	  it.parentNode.title="";
    	  }
      });

  //network->zones
  for(let item of document.getElementsByClassName('yui-dt-liner'))
    item.childNodes.forEach(function(it){
      if(it.tagName=="DIV" && it.title && it.style['white-space'] == "nowrap") {
        it.innerHTML = it.title.replaceAll(" , ", "<br>").replaceAll(" ,", "<br>").replaceAll(",", "<br>");
        it.style.removeProperty("white-space");
      }
    });

  //network->zones[device access]
  for(let item of document.getElementsByClassName('yui-dt-liner'))
    if(item.innerHTML.length <= item.title.length) {
      item.innerHTML = item.title.replaceAll(" , ", "<br>").replaceAll(" ,", "<br>");
      item.title="";
    }

  //hosts_and_services->services
  for(let item of document.getElementsByClassName('yui-dt-liner'))
    if(item.firstChild) if(item.firstChild.innerHTML)
      if(item.firstChild.innerHTML.length <= item.firstChild.title.length && item.firstChild.innerHTML.endsWith("...")) {
        item.firstChild.innerHTML = item.firstChild.title.replaceAll(" , ", "<br>").replaceAll(" ,", "<br>");
        item.firstChild.title="";
      }
}, 500);aa

// Keep session alive
setInterval(function() {
    $.post('/webconsole/Controller?', 'mode=1322&requestObj={}&__RequestType=ajax');
}, 30000);
