// main function to handle requests
function handlerequest() {
	if(window.location.pathname == "/") {
		// show upload page
		showPage('upload.html','upload');
	} else {
		// this is not a request for a known url, get fileid and password
		var fileid = window.location.pathname.substr(1);
		
		// check if fileid exists
		var xhr = new XMLHttpRequest();
		xhr.open('GET', '/api/exists?fileid='+fileid, true);
		xhr.onload = function(e) {
			if (this.status == 200) {
				var responseobject = JSON.parse(xhr.responseText);
				if (responseobject.exists) {
					// fileid exists
					if(window.location.hash.substr(1)=="") {
						content = '<div class="alert alert-info">Enter password:</div>\n';
						content += '<input type="text" id="password">\n';
						content += '<button type="button" class="btn btn-large btn-success" onclick="pwredirect(\'' + fileid + '\');">Go</button>\n';
						setContent(content,'download');
					} else {
						// show download page
						showPage('download.html','download');
					};
				} else {
					// fileid does not exist
					setContent('<div class="alert alert-error">Invalid fileid. Expired ?</div>\n','download');
					return;
				};
			} else if (this.status == 404) {
				//fileid does not exist
				setContent('<div class="alert alert-error">Invalid fileid. Expired ?</div>\n','download');
			};
		};
		
		// send /exists request
		xhr.send();
	};
};

// function to set page content
function setContent(content,menuitem) {
	// set main page content
	document.getElementById('content').innerHTML=content
	// get all menuitems
	var menuitems = document.getElementsByClassName('menuitem');
	// loop through menuitems
	for(var i=0; i<menuitems.length; i++) { 
		// this is the active menuitem
		if(menuitems[i].id == menuitem) {
			menuitems[i].className="menuitem active";
		} else {
			menuitems[i].className="menuitem";
		};
	};
};

// function to show pages from custom menu items
function showPage(url,key) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', '/'+url, true);
	xhr.onload = function(e) {
		if (this.status == 200) {
			// display page content
			setContent(xhr.responseText,key);
			
			// some logic is put here to make sure the page is done 
			// loading before the functions are called
			if(url == 'upload.html') {
				// create random password
				document.getElementById('password').value=randomPassword(40);

				//wait for a file to be selected
				document.getElementById('files').addEventListener('change', handleFileSelect, false);
			}
			
			if(key == 'download') {
				// get metadata
				var fileid = window.location.pathname.substr(1);
				getmetadata(fileid);
			}
		} else {
			alert("Unable to get content, check client config!");
		};
	};
	xhr.send();
};