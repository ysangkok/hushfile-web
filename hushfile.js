// load and apply config
var xhr = new XMLHttpRequest();
xhr.open('GET', '/hushfile-config.json', true);
xhr.onload = function(e) {
	if (this.status == 200) {
		var config = JSON.parse(xhr.responseText);
		
		// handle footer config
		if(!(config.footer.showfooter)) {
			document.getElementById('navbarbottom').style.display = 'none';
		} else {
			if(config.footer.footer == "default") {
				// show the default footer, set email
				document.getElementById('operatoremail').href = 'mailto:'+config.footer.operatoremail;
			} else {
				// get and show custom footer
				footerxhr = new XMLHttpRequest();
				footerxhr.open('GET', '/'+config.footer.footer, true);
				footerxhr.onload = function(e) {
					if (this.status == 200) {
						// footer fetched OK, replace default footer
						document.getElementById('navbarbottominner').innerHTML=footerxhr.responseText;
					} else {
						document.getElementById('navbarbottominner').innerHTML='<div class="alert alert-error">Unable to get footer :( Check client config!</div>';
					};
				};
			};
		};
		
		// handle menu config, loop through custom menu items
		for(var i=0;i<config.menuitems.length;i++){
			var obj = config.menuitems[i];
			for(var key in obj){
				// create divider li
				li = document.createElement("li");
				li.className = "divider-vertical";
				document.getElementById('navmenu').appendChild(li);
				
				// create link li
				li = document.createElement("li");
				li.id = key;
				li.className = "menuitem";
				a = document.createElement("a");
				a.href="javascript:showPage('" + obj[key] + "','" + key + "');";
				linkText = document.createTextNode(key);
				a.appendChild(linkText);
				li.appendChild(a);
				document.getElementById('navmenu').appendChild(li);
			}
		}
		// configuration OK, handle request
		hfhandlerequest();
	} else {
		// unable to get config, use defaults
		hfhandlerequest();
	};
};

// send initial request to get config
xhr.send();
