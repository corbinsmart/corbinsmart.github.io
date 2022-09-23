$(document).ready(function() {
	// get cookie
	//var levels = Cookies.get('levels')
	var ordernum = Cookies.get('ordernum-MancalaStack')
	//if (levels)
	//	$('#levelsinput').val(levels)
	if (ordernum)
		$('#ordernuminput').val(ordernum)

	// on change
	$('#ordernuminput').bind('input propertychange', function() {	
		var val = $('#ordernuminput').val()
		Cookies.set('ordernum-MancalaStack', val)
	})
	$('#levelsinput').bind('input propertychange', function() {	
		//var val = $('#levelsinput').val()
		//Cookies.set('levels', val)
	})

	// convert
	$('#convert').click(function() {
		// status
		$('#statustext').html('<span style="color: black;">Working...</span>')

		var ordernum = $('#ordernuminput').val()
		var levels = $('#levelsinput').val()
		console.log('begin download')
		fetch('http://155.138.199.201:8081/makelevels', {
			method: 'POST',
			headers: {
				'game': 'MancalaStack',
				'ordernum': ordernum,
				'Content-Type': 'text/plain'
			},
			body: levels,
		})
			.then(function(response) {
				console.log(response.status)
				if (response.status == 200) {
					response.blob().then(function(blob) {
						const url = window.URL.createObjectURL(blob);
						const a = document.createElement("a");
						a.style.display = "none";
						a.href = url;
						a.download = "levels.zip";
						document.body.appendChild(a);
						a.click();
						window.URL.revokeObjectURL(url);
					})
					$('#statustext').html('')
				}
				else {
					response.text().then(function(text) {
						console.log('ERROR: ' + text)
						$('#statustext').html('<span style="color: red;">' + text + '</span>')
					})
				}
			})
			/*.then(resp => resp.blob())
			.then(blob => {
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.style.display = "none";
				a.href = url;
				a.download = "levels.zip";
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
			})*/
			.catch(() => {
				console.log('ERROR: Server Error. Please try again.')
				$('#statustext').html('<span style="color: red;">Server Error. Please try again.</span>')
			})
	})
})

function download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}
