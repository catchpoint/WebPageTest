// note: this section is borrowed from green-hosting js. 
let collectHostStatuses = async function(){
    const hosts = [location.host];
    $WPT_REQUESTS.forEach(req => {
        var url = new URL(req.url);
        var host = url.host;
        if( hosts.indexOf(host) === -1 ){
            hosts.push(host);
        }
    });

    const requests = hosts.map((url) => fetch('https://api.thegreenwebfoundation.org/api/v3/greencheck/' + url).then(res => res.json())); 
    return await Promise.all(requests); 
}

return collectHostStatuses();