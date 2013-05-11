// set page content
function setContent(content) {
	document.getElementById('content').innerHTML=content
};

// return a random password of the given length
function randomPassword(length) {
	chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
	pass = "";
	for(x=0;x<length;x++) {
		i = Math.floor(Math.random() * 62);
		pass += chars.charAt(i);
	}
	return pass;
};

// progress function for filereader on upload page
function updateProgress(evt) {
	// evt is an ProgressEvent.
	if (evt.lengthComputable) {
		var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
		// Increase the load_progress bar length.
		if (percentLoaded < 100) {
			load_progress.style.width = percentLoaded + '%';
			load_progress.textContent = percentLoaded + '%';
		};
	};
};

// function that handles reading file after it has been selected
function handleFileSelect(evt) {
	// Reset load_progress indicator on new file selection.
	load_progress.style.width = '0%';
	load_progress.textContent = '0%';
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
		load_progress.style.width = '100%';
		load_progress.textContent = '100%';
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

function upload(cryptoobject,metadataobject,deletepassword) {
	var xhr = new XMLHttpRequest();
	xhr.open('POST', '/api/upload', true);
	xhr.onload = function(e) {
		//make sure progress is at 100%
		upload_progress.style.width = '100%';
		upload_progress.textContent = '100%';
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
			upload_progress.style.width = temp + '%';
			upload_progress.textContent = temp + '%';
		};
	};
	var formData = new FormData();
	formData.append('cryptofile', cryptoobject);
	formData.append('metadata', metadataobject);
	formData.append('deletepassword', deletepassword);
	xhr.send(formData);
};

var download_progress = document.querySelector('.downloadpercent');

//function that downloads the file to the browser,
//and decrypts and creates download button
function download() {
	// hide the download button
	document.getElementById('download').className="btn btn-large btn-primary btn-success disabled";
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
		} else {
			alert("An error was encountered downloading filedata.");
		};
	};
	
	// Listen to the download progress.
	xhr.onprogress = function(e) {
		if (e.lengthComputable) {
			temp = Math.round((e.loaded / e.total) * 100);
			download_progress.style.width = temp + '%';
			download_progress.textContent = temp + '%';
		};
	};

	xhr.send();
};



if(window.location.pathname == "/") {
	// show upload page

	// highligt menu item
	document.getElementById("upload").className="active";
	document.getElementById("about").className="";
	document.getElementById("faq").className="";
	
	// create welcome alert box
	content =  '<div class="alert alert-info fade in">\n';
	content += '<button type="button" class="close" data-dismiss="alert">&times;</button>\n';
	content += '<h4>Welcome!</h4>\n';
	content += 'hushfile is a file sharing service where the file is <b>encrypted before upload</b>. This enables you to share files while <b>keeping them private</b> from server operators and eavesdroppers. Just pick a file and it will be <b>encrypted in your browser</b> before it is uploaded. When the process is finished you will receive a link which you can share with anyone you wish. Just <b>keep the link secret</b>, it contains the password to decrypt the file!\n';
	content += '</div>\n';
	
	// create upload form
	content += '<form class="form-horizontal">\n';
	content += '<div class="fileupload fileupload-new" data-provides="fileupload">\n';
	content += '<div class="input-append">\n';
	content += '<div class="uneditable-input span3">\n';
	content += '<i class="icon-file fileupload-exists"></i>\n';
	content += '<span class="fileupload-preview"></span>\n';
	content += '</div>\n';
	content += '<span class="btn btn-file"><span class="fileupload-new">Select file</span>\n';
	content += '<span class="fileupload-exists">Change</span>\n';
	content += '<input type="file" id="files" name="file">\n';
	content += '</span>\n';
	content += '<a href="#" class="btn fileupload-exists" data-dismiss="fileupload">Remove</a>\n';
	content += '</div>\n';
	content += '</div>\n';
	content += '<div class="input-append" style="display: none;">\n';
	content += '<input class="input-large" type="text" id="password" name="password">\n';
	content += '<span class="add-on">Password</span>\n';
	content += '</div>\n';
	content += '</form>\n';
	
	// create filereading progess div
	content += '<div id="read_progress_div" style="display: none;">\n'
	content += '<p><i id="readingdone" class="icon-check-empty"></i> <b>Reading file...</b>\n';
	content += '<div class="progress progress-striped" id="read_progress_bar" style="width: 20em;">\n';
	content += '<div class="loadpercent bar bar-success">0%</div>\n';
	content += '</div></p>\n';
	content += '<table class="table table-condensed">\n';
	content += '<tr><td>Filename</td><td id="filename">&nbsp;</td></tr>\n';
	content += '<tr><td>Mime type</td><td id="mimetype">&nbsp;</td></tr>\n';
	content += '<tr><td>File size</td><td id="filesize">&nbsp;</td></tr>\n';
	content += '</table>\n';
	content += '</div>\n';
	
	// create encrypting div
	content += '<div id="encrypting" style="display: none;">\n';
	content += '<p><i id="encryptingdone" class="icon-check-empty"></i> <b>Encrypting...</b></p>\n';
	content += '</div>\n';
	
	// create uploading div
	content += '<div id="uploading" style="display: none;">\n';
	content += '<p><i id="uploaddone" class="icon-check-empty"></i> <b>Uploading...</b>\n';
	content += '<div class="progress progress-striped" id="upload_progress_bar" style="width: 20em;">\n';
	content += '<div class="uploadpercent bar bar-success">0%</div>\n';
	content += '</div></p>\n';
	content += '</div>\n';
	
	// create response div
	content += '<div class="alert alert-info" id="response" style="display: none;">\n';
	content += '<h4>Response</h4>\n';
	content += '</div>\n';
	
	setContent(content);
	
	var reader;
	var load_progress = document.querySelector('.loadpercent');
	var upload_progress = document.querySelector('.uploadpercent');
	var encrypted;
	var filename;
	var mimetype;
	var filesize;

	// create random password
	document.getElementById('password').value=randomPassword(40);

	//wait for a file to be selected
	document.getElementById('files').addEventListener('change', handleFileSelect, false);
} else if(window.location.pathname == "/faq") {
	// highligt menu item
	document.getElementById("upload").className="";
	document.getElementById("about").className="";
	document.getElementById("faq").className="active";
	
	content = '<h1>hushfile.it Frequently Asked Questions</h1>\n';
	content += '<dl>\n';
	content += '<dt>Which browsers are known to work ?</dt>\n';
	content += '<dd>\n';
	content += '<ul>\n';
	content += '<li>Google Chrome Version 26.0.1410.64</li>\n';
	content += '<li>Firefox 20.0.1</li>\n';
	content += '<li>Please report more working browsers to the <a href="mailto:hushfile@hushfile.it">author</a>!</li>\n';
	content += '</ul>\n';
	content += '</dd>\n';
	content += '<dt>Which encryption is used ? Is it safe ?</dt>\n';
	content += '<dd>\n';
	content += 'The file it\'s metadata are both encrypted with AES-256 in CBC mode with PKCS7 padding. The actual encryption is performed by the <a href="http://code.google.com/p/crypto-js/" target="_blank">CryptoJS 3.1.2</a> library. From their website:\n';
	content += '<blockquote>\n';
	content += '<p>CryptoJS is a growing collection of standard and secure cryptographic algorithms implemented in JavaScript using best practices and patterns. They are fast, and they have a consistent and simple interface.</p>\n';
	content += '</blockquote>\n';
	content += '</dd>\n';
	content += '</dl>\n';
	setContent(content);
} else if(window.location.pathname == "/about") {
	// highligt menu item
	document.getElementById("upload").className="";
	document.getElementById("about").className="active";
	document.getElementById("faq").className="";
	
	content = '<div class="alert alert-info">\n';
	content += '<h4>Welcome</h4>\n';
	content += 'hushfile is a file sharing service where the file is <b>encrypted before upload</b>. This enables you to share files while <b>keeping them private</b> from server operators and eavesdroppers. Just pick a file and it will be <b>encrypted in your browser</b> before it is uploaded. When the process is finished you will receive a link which you can share with anyone you wish. Just <b>keep the link secret</b>, it contains the password to decrypt the file!\n';
	content += '<div class="alert alert-info">\n';
	content += '<h4>Background</h4>\n';
	content += 'The idea for hushfile came from the pastebin <a href="https://ezcrypt.it/">ezcrypt.it</a>. Ezcrypt.it is like a normal pastebin, except that it encrypts the pasted text before it is uploaded to the server. Hushfile is a file-version of ezcrypt.it, an easy way to share files with those you wish to share with, and noone else. This might seem like a subtle difference from a normal pastebin or filesharing service, but it is a <b>great</b> idea. I firmly believe that the best way to promote privacy online is to put <b>easy to use encryption</b> into the hands of the end users. People are lazy, but if a private alternative is as easy to use as a non-private one, the choice is easy.\n';
	content += '</div>\n';
	setContent(content);
} else {
	// this is not a request for a known url, get fileid and password
	var fileid = window.location.pathname.substr(1);
	var password = window.location.hash.substr(1);
	
	// highligt no menu items
	document.getElementById("upload").className="active";
	document.getElementById("about").className="";
	document.getElementById("faq").className="";
	
	// create download page content
	content = '<h1>hushfile.it - download file</h1>\n';
	content += '<div id="metadata" style="display: none;">\n';

	// create metadata div 
	content += '<div class="alert alert-success">\n';
	content += '<p>Password accepted, metadata below. Click button to get and decrypt file.</p>\n';
	content += '</div>\n';
	
	// table with metadata
	content += '<table class="table table-condensed">\n';
	content += '<tr><td>Filename</td><td id="filename">&nbsp;</td></tr>\n';
	content += '<tr><td>Mime type</td><td id="mimetype">&nbsp;</td></tr>\n';
	content += '<tr><td>File size</td><td id="filesize">&nbsp;</td></tr>\n';
	content += '<tr><td>Uploader IP</td><td id="clientip">&nbsp;</td></tr>\n';
	content += '</table>\n';
	content += '<button class="btn btn-large btn-primary btn-success" id="download" type="button" onclick="download();"><i class="icon-cloud-download icon-large"></i> Get and decrypt</button>\n';
	content += '<a href="" class="btn btn-large btn-primary btn-danger" id="delete"><i class="icon-trash icon-large"></i> Delete file</a>\n';
	content += '</div>\n';

	// create downloading progress div
	content += '<div id="downloading" style="display: none;">\n';
	content += '<p><i id="downloadingdone" class="icon-spinner icon-spin"></i> <b>Downloading...</b></p>\n';
	content += '<div class="progress progress-striped" id="download_progress_bar" style="width: 20em;">\n';
	content += '<div class="downloadpercent bar bar-success">0%</div>\n';
	content += '</div>\n';
	content += '</div>\n';

	// create decrypting div
	content += '<div id="decrypting" style="display: none;">\n';
	content += '<p><i id="decryptingdone" class="icon-spinner icon-spin"></i> <b>Decrypting...</b></p>\n';
	content += '</div>\n';

	// create user download div
	content += '<div id="downloaddiv" style="display: none;"></div>\n';
	
	setContent(content);
	
	var download_progress = document.querySelector('.downloadpercent');
	
	// check if it is a file id that exists
	var xhr = new XMLHttpRequest();
	xhr.open('GET', '/api/exists?fileid='+fileid, true);
	xhr.onload = function(e) {
		if (this.status == 200) {
			var responseobject = JSON.parse(xhr.responseText);
			if (responseobject.exists) {
				// fileid exists
				// download and decrypt metadata
				var xhr2 = new XMLHttpRequest();
				xhr2.open('GET', '/api/metadata?fileid='+fileid, true);
				xhr2.onload = function(e) {
					if (this.status == 200) {
						// decrypt metadata
						try {
							metadata = CryptoJS.AES.decrypt(this.response, password).toString(CryptoJS.enc.Utf8);
						} catch(err) {
							alert("An error was encountered decrypting metadata: " + err);
						};
						
						if(metadata != 'undefined') {
							try {
								var jsonmetadata = JSON.parse(metadata);
								document.getElementById('metadata').style.display="block";
								document.getElementById('filename').innerHTML = jsonmetadata.filename;
								document.getElementById('mimetype').innerHTML = jsonmetadata.mimetype;
								document.getElementById('filesize').innerHTML = jsonmetadata.filesize;
								document.getElementById('delete').href = "/api/delete?fileid=" + fileid + "&deletepassword=" + jsonmetadata.deletepassword;
							} catch(err) {
								alert("An error was encountered parsing metadata: " + err);
							};
						};
					} else {
						alert("An error was encountered downloading metadata.");
					};
				};
				xhr2.send();
			} else {
				// fileid does not exist
				setContent('<div class="alert alert-error">Invalid fileid. Expired ?</div>\n');
			};
		} else if (this.status == 404) {
			//fileid does not exist
			setContent('<div class="alert alert-error">Invalid fileid. Expired ?</div>\n');
		};
	};
	// send /exists request
	xhr.send();
	
	// create XHR to get IP
	var ipxhr = new XMLHttpRequest();
	ipxhr.open('GET', '/api/ip?fileid='+fileid, true);
	ipxhr.onload = function(e) {
		if (this.status == 200) {
			var jsonip = JSON.parse(metadata);
			document.getElementById('clientip').innerHTML = jsonip.uploadip;
		} else {
			alert("An error was encountered downloading metadata.");
		};
	};
	// get IP
	ipxhr.send();
};