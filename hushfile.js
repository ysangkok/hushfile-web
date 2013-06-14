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


// function to redirect the browser after a new password has been entered
function pwredirect(fileid) {
	password = document.getElementById('password').value;
	window.location = "/"+fileid+"#"+password;
	getmetadata(fileid);
};

// return a random password of the given length
function randomPassword(length){
	var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_-";
	var pass="";
	var randomBuf = new Uint8Array(length);
	window.crypto.getRandomValues(randomBuf);
	for(var i=0;i<length;i++)
	pass += chars.charAt(Math.floor(randomBuf[i]/4));
	return pass;
}

// progress function for filereader on upload page
function updateProgress(evt) {
	// evt is an ProgressEvent.
	if (evt.lengthComputable) {
		var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
		// Increase the load_progress bar length.
		document.getElementById("filereadpercentbar").style.width = percentLoaded + '%';
		document.getElementById("filereadpercentbar").textContent = percentLoaded + '%';
	};
};

// function to download and decrypt metadata, 
// and create download page content
function getmetadata(fileid) {
	var password = window.location.hash.substr(1);

	// show download page
	showPage('download.html','download');

	// download and decrypt metadata
	var xhr2 = new XMLHttpRequest();
	xhr2.open('GET', '/api/metadata?fileid='+fileid, true);
	xhr2.onload = function(e) {
		if (this.status == 200) {
			// decrypt metadata
			try {
				metadata = CryptoJS.AES.decrypt(this.response, password).toString(CryptoJS.enc.Utf8);
			} catch(err) {
				content = '<div class="alert alert-error">Unable to decrypt metadata, invalid password.</div>\n';
				content += '<div class="alert alert-info">Enter password:</div>\n';
				content += '<input type="text" id="password">\n';
				content += '<button type="button" class="btn btn-large btn-success" onclick="pwredirect(\'' + fileid + '\');">Go</button>\n';
				setContent(content,'download');
				return;
			};
			
			if(metadata != 'undefined') {
				try {
					var jsonmetadata = JSON.parse(metadata);
					document.getElementById('metadata').style.display="block";
					document.getElementById('filename').innerHTML = jsonmetadata.filename;
					document.getElementById('mimetype').innerHTML = jsonmetadata.mimetype;
					document.getElementById('filesize').innerHTML = jsonmetadata.filesize;
					document.getElementById('deletepassword').innerHTML = jsonmetadata.deletepassword;
				} catch(err) {
					setContent('<div class="alert alert-error">Unable to parse metadata, sorry.</div>\n','download');
					return;
				};
			};
		} else {
			setContent('<div class="alert alert-error">Unable to download metadata, sorry.</div>\n','download');
			return;
		};
	};
	xhr2.send();
	
	// create XHR to get IP
	var ipxhr = new XMLHttpRequest();
	ipxhr.open('GET', '/api/ip?fileid='+fileid, true);
	ipxhr.onload = function(e) {
		if (this.status == 200) {
			var jsonip = JSON.parse(ipxhr.responseText);
			document.getElementById('clientip').innerHTML = jsonip.uploadip;
		} else {
			alert("An error was encountered getting uploader ip.");
		};
	};

	// send IP request
	ipxhr.send();
}


// function that handles reading file after it has been selected
function handleFileSelect(evt) {
	// show upload page elements
	document.getElementById('uploadbuttondiv').style.display="none";
	document.getElementById('read_progress_div').style.display="block";
	document.getElementById('encrypting').style.display="block";
	document.getElementById('uploading').style.display="block";

	//create filereader object
	reader = new FileReader();
	
	//register event handlers
	reader.onprogress = updateProgress;

	// runs after file reading completes
	reader.onload = function(e) {
		// Ensure that the load_progress bar displays 100% at the end.
		document.getElementById("filereadpercentbar").style.width = '100%';
		document.getElementById("filereadpercentbar").textContent = '100%';
		document.getElementById('readingdone').className= 'icon-check';
		document.getElementById('read_progress_div').style.color='green';
		
		//make the next section visible
		document.getElementById('encrypting').style.display="block";
		document.getElementById('encryptingdone').className="icon-spinner icon-spin";
		setTimeout('encrypt()',1000);
	};

	// get file info and show it to the user
	filename = evt.target.files[0].name;
	if(evt.target.files[0].type === 'undefined') {
		mimetype = "application/octet-stream";
	} else {
		mimetype = evt.target.files[0].type;
	}
	filesize = evt.target.files[0].size;
	document.getElementById('filename').innerHTML = filename;
	document.getElementById('mimetype').innerHTML = mimetype;
	document.getElementById('filesize').innerHTML = filesize;
	document.getElementById('file_info_div').style.display="block";
	
	// begin reading the file
	reader.readAsArrayBuffer(evt.target.files[0]);
};


// function that encrypts the file,
// and creates and encrypts metadata
function encrypt() {
	//encrypt the data
	ui8a = new Uint8Array(reader.result);
	wordarray = CryptoJS.enc.u8array.parse(ui8a);
	cryptoobject = CryptoJS.AES.encrypt(wordarray, document.getElementById('password').value);

	//generate deletepassword
	deletepassword = randomPassword(40);
	
	//encrypt the metadata
	metadatajson = '{"filename": "'+filename+'", "mimetype": "'+mimetype+'", "filesize": "'+filesize+'", "deletepassword": "' + deletepassword + '"}'
	metadataobject = CryptoJS.AES.encrypt(metadatajson, document.getElementById('password').value);

	//done encrypting
	document.getElementById('encryptingdone').className="icon-check";
	document.getElementById('encrypting').style.color='green';

	//make the next section visible
	document.getElementById('uploading').style.display="block";
	document.getElementById('uploaddone').className="icon-spinner icon-spin";

	setTimeout('upload(cryptoobject,metadataobject,deletepassword)',1000);
}

// function that uploads the data to the server
function upload(cryptoobject,metadataobject,deletepassword) {
	var xhr = new XMLHttpRequest();
	xhr.open('POST', '/api/upload', true);
	xhr.onload = function(e) {
		//make sure progress is at 100%
		document.getElementById("uploadprogressbar").style.width = '100%';
		document.getElementById("uploadprogressbar").textContent = '100%';
		//parse json reply
		try {
			var responseobject = JSON.parse(xhr.responseText);
			if (responseobject.status=='ok') {
				document.getElementById('uploaddone').className= "icon-check";
				document.getElementById('uploading').style.color='green';
				document.getElementById('response').style.display="block";
				//get current URL
				url = window.location.protocol + '://' + window.location.host + '/';
				document.getElementById('response').innerHTML = '<p><i class="icon-check"></i> <b><span style="color: green;">Success! Your URL is:</span></b><br> <a class="btn btn-success" href="/'+responseobject.fileid+'#'+document.getElementById('password').value+'">'+url+responseobject.fileid+'#'+document.getElementById('password').value+'</a>';
			} else {
				document.getElementById('response').innerHTML = 'Something went wrong. Sorry about that. <a href="/">Try again.</a>';
			}
		} catch(err) {
			document.getElementById('response').innerHTML = 'Something went wrong: ' + err;
		};
	};

	// Listen to the upload progress
	xhr.upload.onprogress = function(e) {
		if (e.lengthComputable) {
			temp = Math.round((e.loaded / e.total) * 100);
			document.getElementById("uploadprogressbar").style.width = temp + '%';
			document.getElementById("uploadprogressbar").textContent = temp + '%';
		};
	};
	var formData = new FormData();
	formData.append('cryptofile', cryptoobject);
	formData.append('metadata', metadataobject);
	formData.append('deletepassword', deletepassword);
	xhr.send(formData);
};


//function that deletes the file
function deletefile(fileid) {
	// disable the delete button
	document.getElementById('delete').className="btn btn-large btn-primary btn-success disabled";
	document.getElementById('deleting').style.display="block";
	var xhr = new XMLHttpRequest();
	xhr.open('GET', '/api/delete?fileid='+fileid+'&deletepassword='+document.getElementById('deletepassword').innerHTML, true);

	xhr.onload = function(e) {
		document.getElementById('deleteresponse').style.display="block";
		if (this.status == 200) {
			//parse response json
			var responseobject = JSON.parse(xhr.responseText);
			if(responseobject.deleted) {
				//file deleted OK
				document.getElementById('deletingdone').className="icon-check";
				document.getElementById('deleteresponse').innerHTML="<div class='alert alert-success'>File deleted successfully</div>\n";
			} else {
				//unable to delete file
				document.getElementById('deletingdone').className="icon-warning-sign";
				document.getElementById('deleteresponse').innerHTML="<div class='alert alert-error'>Unable to delete file</div>\n";
			};
		} else if (this.status == 401) {
			document.getElementById('deletingdone').className="icon-warning-sign";
			document.getElementById('deleteresponse').innerHTML="<div class='alert alert-error'>Incorrect deletepassword</div>\n";
		};
	};
	
	xhr.send();
}


//function that downloads the file to the browser,
//and decrypts and creates download button
function download(fileid) {
	// get password from window.location
	var password = window.location.hash.substr(1);
	// disable the download button
	document.getElementById('downloadbtn').className="btn btn-large btn-primary btn-success disabled";
	// make download progress bar div visible
	document.getElementById('downloading').style.display="block";
	var xhr = new XMLHttpRequest();
	xhr.open('GET', '/api/file?fileid='+fileid, true);
	xhr.onload = function(e) {
		if (this.status == 200) {
			//done downloading, make downloading div green and change icon
			document.getElementById('downloading').style.color='green';
			document.getElementById('downloadingdone').className="icon-check";

			//make the decrypting div visible
			document.getElementById('decrypting').style.display="block";

			// decrypt the data
			decryptedwords = CryptoJS.AES.decrypt(this.response, password);
			ui8a = CryptoJS.enc.u8array.stringify(decryptedwords);
			fileblob = new Blob([ui8a], { type: document.getElementById('mimetype').innerHTML });

			//done decrypting, change icon and make div green
			document.getElementById('decryptingdone').className="icon-check";
			document.getElementById('decrypting').style.color='green';

			// download button
			a = document.createElement("a");
			a.href = window.URL.createObjectURL(fileblob);
			a.download = document.getElementById('filename').innerHTML;
			linkText = document.createTextNode(" Download");
			i = document.createElement("i");
			i.className="icon-save icon-large";
			a.appendChild(i);
			a.appendChild(linkText);
			a.className = "btn btn-large btn-primary btn-success";
			document.getElementById('downloaddiv').appendChild(a);
			
			//make div visible
			document.getElementById('downloaddiv').style.display="block";
			
			// if this is an image, make a preview
			if((/image/i).test(document.getElementById('mimetype').innerHTML)){
				img = document.createElement("img");
				img.className="img-rounded";
				img.src = window.URL.createObjectURL(fileblob);
				a = document.createElement("a");
				a.href = window.URL.createObjectURL(fileblob);
				a.download = document.getElementById('filename').innerHTML;
				a.appendChild(img);
				document.getElementById('imagepreview').appendChild(a);
				document.getElementById('imagediv').style.display="block";
			};

		} else {
			alert("An error was encountered downloading filedata.");
		};
	};
	
	// Listen to the download progress.
	xhr.onprogress = function(e) {
		if (e.lengthComputable) {
			temp = Math.round((e.loaded / e.total) * 100);
			document.getElementById('download_progress_bar_percent').style.width = temp + '%';
			document.getElementById('download_progress_bar_percent').textContent = temp + '%';
		};
	};

	xhr.send();
};


// main function to handle requests
function handlerequest() {
	if(window.location.pathname == "/") {
		// show upload page
		showPage('upload.html','upload');

		// create random password
		document.getElementById('password').value=randomPassword(40);

		//wait for a file to be selected
		document.getElementById('files').addEventListener('change', handleFileSelect, false);
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
						getmetadata(fileid);
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


// function to show pages from custom menu items
function showPage(url,key) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', '/'+url, true);
	xhr.onload = function(e) {
		if (this.status == 200) {
			setContent(xhr.responseText,key);
		} else {
			alert("Unable to get content, check client config!");
		};
	};
	xhr.send();
};


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
		handlerequest();
	} else {
		// unable to get config, use defaults
		handlerequest();
	};
};

// send initial request to get config
xhr.send();
