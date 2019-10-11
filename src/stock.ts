// 新浪股票数据接口
// const url = 'http://hq.sinajs.cn/list='

// 腾讯股票数据接口
// https://blog.csdn.net/USTBHacker/article/details/8365756
const url = 'http://qt.gtimg.cn/q='

const stockList = [
  'sh601398',
  'sh601939',
  'sh601288',
  'sh601988',
  'sh600036',
  'sh601328',
  'sh601166',
  'sh600000',
  'sh601998',
  'sh600016'
]

const stockName = {
  '601398': '工商银行',
  '601939': '建设银行',
  '601288': '农业银行',
  '601988': '中国银行',
  '600036': '招商银行',
  '601328': '交通银行',
  '601166': '兴业银行',
  '600000': '浦发银行',
  '601998': '中信银行',
  '600016': '民生银行'
}

const http = require('http')
const querystring = require('querystring')

function getApiContent (getUrl) {
  return new Promise((resolve, reject) => {
    http.get(getUrl, res => {
      let resData = ''
      res.setEncoding('utf-8')
      res.on('data', chunk => resData += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(resData)
        } else {
          reject('fail: ' + res.statusCode)
        }
      })
    })
  })
}

function parseContent (content) {
  let parseResult = []
  let contentArr = content.trim().split(';')
  
  for (const item of contentArr) {
    if (item.length === 0) continue
    let itemArr = item.split('~')
    parseResult.push({
      // 中文乱码
      name: stockName[itemArr[2]],
      code: itemArr[2],
      price: itemArr[3],
      changevalue: itemArr[31],
      changerate: itemArr[32],
      marketcap: itemArr[45],  // 总市值
      pbratio: itemArr[46]     // 市净率
    })
  }
  return parseResult
}

function sendServerChan (text) {
  const config = require('./ServerChanConfig')
  
  let serverChanUrl = `http://sc.ftqq.com/${config.SCKEY}.send`

  let sendData = {
    text: '波动',
    desp: text
  }

  let req = http.request(serverChanUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  }, (res) => {
    res.setEncoding('utf8');
    if (res.statusCode === 200) {
      console.log('发送成功')
    }
  })

  req.on('error', (e) => {
    console.error('error ==> ', e.message)
  })

  req.write(querystring.stringify(sendData))
  req.end()
}

export function activate (log = false): Promise<any[]> {
  return new Promise((resolve, reject) => {
    getApiContent(url + stockList.join(','))
    .then(res => {
      let stockArr = parseContent(res).sort((a,b) => a.pbratio - b.pbratio)
      // let stockArr = parseContent(res).sort((a,b) => a.marketcap - b.marketcap)

      if (log) {
        console.log(JSON.stringify(stockArr).replace(/},/g, '\n'))
      }
  
      let stockCodeList: any[] = []
      // let sendTextArr = []
      for (let item of stockArr) {
        if (item.pbratio < 0.65) {
          stockCodeList.push(item.code)
          // sendTextArr.push(`### ${stockName[item.code]} -- ${item.code}  \n    价格:${item.price}\n    总市值:${item.marketcap}\n    市净率:${item.pbratio}  \n`)
        }
      }
      // if (sendTextArr.length > 0) {
        // sendServerChan(sendTextArr.join('  '))
      // }
      resolve(stockCodeList)
    })
  })
}

// activate(true)

// exports.activate = activate
