const http = require('http')
const https = require('https')
const urlParser = require('url')
const fs = require('fs')
const md5 = require('md5')
const path = require('path')
const pkg = require('pdf-to-printer')

const host = 'localhost';
const port = 8010;
const {getPrinters: getPrintersNWin, print: printNWin, getDefaultPrinter: getDefaultPrinterNWin} = require('unix-print')


const {getPrinters: getPrintersWin, print: printWin, getDefaultPrinter: getDefaultPrinterWin} = pkg;


let getPrinters;
let print;
let getDefaultPrinter;
if (process.platform === 'win32') {
    print = printWin;
    getPrinters = getPrintersWin;
    getDefaultPrinter = getDefaultPrinterWin;
} else {
    print = printNWin;
    getPrinters = getPrintersNWin;
    getDefaultPrinter = getDefaultPrinterNWin;
}

const requestListener = (req, res) => {

    res.setHeader("Content-Type", "application/json");
    res.setHeader('Access-Control-Allow-Origin', 'http://' + req.headers.host);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization');
    let message = {"message": "not found"};
    let code = 200;
    let url = urlParser.parse(req.url, true);
    // console.log(url.pathname)
    switch (url.pathname) {
        case "/list":
            code = 0
            message = {"message": "list"};
            getPrinters().then((l) => {
                message.list = l
                getDefaultPrinter().then((def) => {
                    message.default = def
                    res.end(JSON.stringify(message));
                });

            });

            break
        case "/print":
            const filename = md5(url.query.file) + ".pdf";
            const file = fs.createWriteStream(filename);
            try {
                fs.unlinkSync(filename);
            } catch (e) {

            }
            https.get(url.query.file, function (response) {
                response.pipe(file);
                file.on("finish", () => {
                    file.close();
                    let options = {
                        printer: url.query.printer,
                    };
                    if(typeof url.query.paperSize){
                        options.paperSize =  url.query.paperSize
                    }

                    print(filename, options).then((ress) => {

                        setTimeout(() => {
                            fs.unlinkSync(filename);
                        }, 10000)


                    })

                })
            }).on('error', (e) => {
                console.error(e);
            });

            code = 200
            message = {"message": "print", "file": filename};
            break
        default:
            code = 200
            message = {"message": "ok"};
            break
    }
    if (code > 0) {
        res.writeHead(code);
        res.end(JSON.stringify(message));
    }

};


const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});