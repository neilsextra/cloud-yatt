function Cloud(image_metadata) {

	this.image_metadata = image_metadata;

}

Cloud.prototype.query = function (token, container) {

	function get_image_blob(token, container, blob) {
		return new Promise(accept => {
			var xhttp = new XMLHttpRequest();

			xhttp.open("GET", `/retreive?token=${encodeURIComponent(token)}&container=${encodeURIComponent(container)}&blob=${blob}`, true);
			xhttp.responseType = "blob";
			xhttp.onreadystatechange = function () {

				if (this.readyState === 4 && this.status === 200) {

					accept(this.response);

				}

			}

			xhttp.send();

		});

	}

	function get_json_blob(token, container, blob) {
		return new Promise(accept => {
			var xhttp = new XMLHttpRequest();

			xhttp.open("GET", `/retreive?token=${encodeURIComponent(token)}&container=${encodeURIComponent(container)}&blob=${blob}`, true);

			xhttp.onreadystatechange = function () {

				if (this.readyState === 4 && this.status === 200) {
					
					accept(this.responseText);

				}

			}

			xhttp.send();

		});

	}

	return new Promise(accept => {
		var xhttp = new XMLHttpRequest();

		xhttp.open("GET", `/query?token=${encodeURIComponent(token)}&container=${encodeURIComponent(container)}`, true);

		xhttp.onreadystatechange = async function () {

			if (this.readyState === 4 && this.status === 200) {
				var images = [];
				var tags = [];
				var names = [];
				var models = [];

				var response = JSON.parse(this.responseText);

				for (var iBlob in response[0]['blobs']) {
					var image_name = response[0]['blobs'][iBlob].replace(/\.[^/.]+$/, "");

					if (response[0]['blobs'][iBlob].endsWith('.json')) {
						var json = await get_json_blob(token, container, response[0]['blobs'][iBlob]);
					
						document.getElementById("waitMessage").textContent = `[${Math.trunc(iBlob/response[0]['blobs'].length*100)}%] Retrieved: ${image_name}`;

						tags[image_name] = JSON.parse(json);

					} else if (response[0]['blobs'][iBlob].match(/.(jpg|jpeg|png|gif)$/i)) {
						images[image_name] = await get_image_blob(token, container, response[0]['blobs'][iBlob]);
						names[image_name] = response[0]['blobs'][iBlob];

					} else if (response[0]['blobs'][iBlob].endsWith('.pt')) {

						models.push({
							token, token,
							container : container,
							filename: response[0]['blobs'][iBlob]
						})

					} 

				}

				accept({
					images: images,
					tags: tags,
					names: names,
					models: models
				});

			} else if (this.status === 500) {

				alert(`Status: ${this.status} - ${this.statusText}`);

				accept({
					status: this.status,
					message: this.statusText
				});

			}

		};

		xhttp.send();

	});

}

Cloud.prototype.save = async function (token, container) {

	function delete_blob(token, container, blob) {
		return new Promise(accept => {
			var xhttp = new XMLHttpRequest();
			xhttp.open("GET", `/delete?token=${encodeURIComponent(token)}&container=${encodeURIComponent(container)}&blob=${blob}`, true);

			xhttp.onreadystatechange = function () {

				if (this.readyState === 4 && this.status === 200) {

					accept(this.responseText);

				}

			}

			xhttp.send();


		});

	}

	return new Promise(async accept => {

		async function post_data(file_name, data) {

			return new Promise(async accept => {
				var formData = new FormData();

				formData.append(file_name, data)

				var xhttp = new XMLHttpRequest();

				xhttp.open("POST", `/save?token=${encodeURIComponent(token)}&container=${encodeURIComponent(container)}`, true);

				xhttp.onreadystatechange = function () {

					if (this.readyState === 4 && this.status === 200) {
						accept({
							status: 200
						});
					} else if (this.readyState === 4 && this.status === 500) {
						accept({
							status: this.status,
							message: this.statusText
						});

					}
				};

				xhttp.send(formData);

			});

		}

		var saved = 0;
		var removed = 0;
		var iCount = 0;
		var nCount = Object.keys(this.image_metadata).length;

		for (var metadata in this.image_metadata) {

			if (!this.image_metadata[metadata].include_in_archive) {
				document.getElementById("waitMessage").textContent = `Removing : ${metadata}`;
				await delete_blob(token, container, metadata);

				removed += 1

				continue;
			}

			var attributes = {
				filename: metadata,
				size: this.image_metadata[metadata].size,
				dimensions: this.image_metadata[metadata].dimensions,
				regions: this.image_metadata[metadata].regions
			}

			var tags = JSON.stringify(attributes);
			var tags_file_name = metadata.replace(/\.[^/.]+$/, "");
			iCount += 1;


			try {
				await post_data(metadata, this.image_metadata[metadata].fileref);
				await post_data(`${tags_file_name}.json`, new Blob([tags], { type: 'text/json' }));
				window.setTimeout((iCount, nCount) => {
					document.getElementById("waitMessage").textContent = `Saved [${Math.trunc(iCount/nCount*100)}%] : ${metadata}`;
				}, 1, iCount, nCount);

			} catch (e) {
				accept({
					status: 'FAIL',
					saved: saved,
					message: e

				});

				return;
			}

			saved += 1;

		}

		accept({
			status: 'OK',
			saved: saved,
			removed: removed
		});

	});

}

Cloud.prototype.upload = async function (token, container, extension) {
	async function post_file(token, container, file_name, file) {

		return new Promise(async accept => {
			var formData = new FormData();

			formData.append(file_name, file)

			var xhttp = new XMLHttpRequest();

			xhttp.open("POST", `/save?token=${encodeURIComponent(token)}&container=${encodeURIComponent(container)}`, true);

			xhttp.onreadystatechange = function () {

				if (this.readyState === 4 && this.status === 200) {
					accept({
						status: 200
					});
				} else if (this.readyState === 4 && this.status === 500) {
					accept({
						status: this.status,
						message: this.statusText
					});

				}
			};

			xhttp.send(formData);

		});

	}

	return new Promise(async accept => {
		var loadButton = document.createElementNS("http://www.w3.org/1999/xhtml", "input");

		loadButton.setAttribute("type", "file");
		loadButton.multiple = true;
		loadButton.accept = `.${extension}`;

		loadButton.onchange = async function (event) {
			document.getElementById("waitDialog").style.display = "inline-block";


			var files = event.target.files;
			var filenames = [];

			for (var iFile = 0; iFile < files.length; ++iFile) {
				document.getElementById("waitDialog").style.display = "inline-block";
				document.getElementById("waitMessage").textContent = `Uploading Model - '${files[iFile].name}'`;

				var result = await post_file(token, container, files[iFile].name, files[iFile]);

				filenames.push(files[iFile].name);

			}

			accept({
				status: 'OK',
				filenames: filenames,
				container: container,
				token: token
			})

		}

		document.body.onfocus = function() {

			document.getElementById("waitDialog").style.display = "none";
			document.body.onfocus = null;

		}

		loadButton.click();

	});

}