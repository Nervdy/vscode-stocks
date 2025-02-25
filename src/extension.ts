import * as vscode from 'vscode'
import * as http from 'http'
import * as stock from './stock'
// const stock = require('./stock.js').activate

let items: Map<string, vscode.StatusBarItem>
export function activate(context: vscode.ExtensionContext) {
    items = new Map<string, vscode.StatusBarItem>();

    refresh()
    setInterval(refresh, 60*1e3)
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(refresh))
}


let refreshIndex = 0
let bankStockList: any[] = []
async function refresh(): Promise<void> {
    const config = vscode.workspace.getConfiguration()
    let configuredSymbols = config.get('vscode-stocks.stockSymbols', [])
    
    if (refreshIndex % 60 === 0) {
        bankStockList = await stock.activate()
    }
    refreshIndex++
    configuredSymbols = configuredSymbols.concat(bankStockList.map(i => 'sh' + i))

    if (!arrayEq(configuredSymbols, Array.from(items.keys()))) {
        cleanup()
        fillEmpty(configuredSymbols)
    }

    refreshSymbols(configuredSymbols)
}

function fillEmpty(symbols: string[]): void {
    symbols
        .forEach((symbol, i) => {
            // Enforce ordering with priority
            const priority = symbols.length - i
            const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, priority)
            item.text = `${symbol}: $…`
            item.show()
            items.set(symbol, item)
        })
}

function cleanup(): void {
    items.forEach(item => {
        item.hide()
        item.dispose()
    })

    items = new Map<string, vscode.StatusBarItem>()
}

async function refreshSymbols(symbols: string[]): Promise<void> {
    if (!symbols.length) {
        return;
    }
    const url = `http://qt.gtimg.cn/q=${symbols.join(',')}`;
    try {
        const response = await httpGet(url)
        // let matched = response.match(/".*"/g);
        let matched = parseContent(response)
        symbols.map((item, index) => {
          updateItemWithSymbolQuote(item, matched[index]);
        })
    } catch (e) {
        throw new Error(`Invalid response: ${e.message}`);
    }
}

function updateItemWithSymbolQuote(symbol, symbolQuote) {
    const item = items.get(symbol)
    const price = Number(symbolQuote.price).toFixed(2)
    const changevalue = Number(symbolQuote.changevalue).toFixed(2)
    const changerate = symbolQuote.changerate
    const pbratio = symbolQuote.pbratio

    if (symbol === 'sh000001' || symbol === 'sh000300') {
        item.text = `${symbol.slice(-3)} ${price} ${changevalue} ${changerate}`
    } else {
        item.text = `${symbol.slice(-3)} ${price} ${changevalue} ${changerate} ${pbratio}`
    }
}

function httpGet(url): Promise<string> {
    return new Promise((resolve, reject) => {
        http.get(url, response => {
            let responseData = '';
            response.setEncoding('utf-8');
            response.on('data', chunk => responseData += chunk);
            response.on('end', () => {
                // Sometimes the 'error' event is not fired. Double check here.
                if (response.statusCode === 200) {
                    resolve(responseData)
                } else {
                    reject('fail: ' + response.statusCode)
                }
            })
        })
    })
}

function arrayEq(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length) return false

    return arr1.every((item, i) => item === arr2[i])
}
function parseContent(content) {
    let parseResult = [];
    let contentArr = content.trim().split(';');
    for (const item of contentArr) {
        if (item.length === 0)
            continue;
        let itemArr = item.split('~');
        parseResult.push({
            code: itemArr[2],
            price: itemArr[3],
            changevalue: itemArr[31],
            changerate: itemArr[32],
            marketcap: itemArr[45],
            pbratio: itemArr[46] // 市净率
        });
    }
    return parseResult;
}