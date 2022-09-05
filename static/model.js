function Model(image_metadata) {

	this.image_metadata = image_metadata;

}

Model.prototype.apply = async function (token, container, model, selected_file) {

	return new Promise(async accept => {

		async function post_data(file_name, data) {

			return new Promise(async accept => {
				var formData = new FormData();

				formData.append(file_name, data)

				var xhttp = new XMLHttpRequest();

				xhttp.open("POST", `/apply?token=${encodeURIComponent(token)}&container=${encodeURIComponent(container)}&model=${encodeURIComponent(model)}`, true);

				xhttp.onreadystatechange = function () {

					if (this.readyState === 4 && this.status === 200) {
						accept({
							status: 200,
							response: this.responseText

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

		try {
			var result = await post_data(selected_file, this.image_metadata[selected_file].fileref);

			accept({
				status: 'OK',
				result: result
			});

		} catch (e) {
			accept({
				status: 'FAIL',
				saved: saved,
				message: e

			});


		}

	});

}