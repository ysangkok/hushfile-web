// function that handles reading file after it has been selected
function hfHandleFileSelect(evt) {
	// show upload page elements
	document.getElementById('uploadbuttondiv').style.display="none";
	document.getElementById('read_progress_div').style.display="block";
	document.getElementById('encrypting').style.display="block";
	document.getElementById('uploading').style.display="block";

	//create filereader object
	reader = new FileReader();
	
	//register event handlers
	reader.onprogress = hfUpdateProgress;

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
		setTimeout('hfEncrypt()',1000);
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
function hfEncrypt() {
	//encrypt the data
	ui8a = new Uint8Array(reader.result);
	wordarray = CryptoJS.enc.u8array.parse(ui8a);
	cryptoobject = CryptoJS.AES.encrypt(wordarray, document.getElementById('password').value);

	//generate deletepassword
	deletepassword = hfRandomPassword(40);
	
	//encrypt the metadata
	metadatajson = '{"filename": "'+filename+'", "mimetype": "'+mimetype+'", "filesize": "'+filesize+'", "deletepassword": "' + deletepassword + '"}'
	metadataobject = CryptoJS.AES.encrypt(metadatajson, document.getElementById('password').value);

	//done encrypting
	document.getElementById('encryptingdone').className="icon-check";
	document.getElementById('encrypting').style.color='green';

	//make the next section visible
	document.getElementById('uploading').style.display="block";
	document.getElementById('uploaddone').className="icon-spinner icon-spin";

	setTimeout('hfUpload(cryptoobject,metadataobject,deletepassword)',1000);
}

// function that uploads the data to the server
function hfUpload(cryptoobject,metadataobject,deletepassword) {
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
				url = window.location.protocol + '//' + window.location.host + '/';
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

// return a random password of the given length
function hfRandomPassword(length){
	var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_-";
	var pass="";
	var randomBuf = new Uint8Array(length);
	window.crypto.getRandomValues(randomBuf);
	for(var i=0;i<length;i++)
	pass += chars.charAt(Math.floor(randomBuf[i]/4));
	return pass;
}

// progress function for filereader on upload page
function hfUpdateProgress(evt) {
	// evt is an ProgressEvent.
	if (evt.lengthComputable) {
		var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
		// Increase the load_progress bar length.
		document.getElementById("filereadpercentbar").style.width = percentLoaded + '%';
		document.getElementById("filereadpercentbar").textContent = percentLoaded + '%';
	};
};
