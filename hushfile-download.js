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

// function to redirect the browser after a new password has been entered
function pwredirect(fileid) {
	password = document.getElementById('password').value;
	window.location = "/"+fileid+"#"+password;
	getmetadata(fileid);
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
