import axios, { AxiosInstance, AxiosResponse } from 'axios'
import fs, { createWriteStream } from 'fs'
// import { writeFileSync } from 'fs';
import convertapiPackage from 'convertapi'

// gavin@vangent.co
// const convertapi = convertapiPackage('P4ZAK9CNztEkT1ti')
// temp email fotey@net2mail.top
const convertapi = convertapiPackage('ZyjFfLYBUjtklzXw');

const AIRPORT_ROUTE_REGEXP = /href\=\"(\/Pages\/Aeronautical\%20Information\/Aeronautical-charts\.aspx\?RootFolder=\S+)\"/ig
const AIRPORT_ICAO_FROM_ROUTE_REGEXP = /\s-\s+(FA[A-Z]{2})|\(FA[A-Z]{2}\)/g
const AIRPORT_PDF_LINK_REGEXP = /href="(\/Aeronautical Charts\/(?:\\.|[^"\\])*.pdf)"/ig

const wantedAirports = ['FACT', 'FAOR', 'FAGG', 'FASD', 'FALE', 'FALA', 'FAEL', 'FAPE', 'FAKN']

export class DefaultService {
  async default (): Promise<void> {
    const instance: AxiosInstance = axios.create({
      baseURL: 'http://www.caa.co.za'
    })

    const streamInstance: AxiosInstance = axios.create({
      baseURL: 'http://www.caa.co.za',
      responseType: 'stream'
    })

    const pages = [
      '/Pages/Aeronautical%20Information/Aeronautical-charts.aspx?p_SortBehavior=1&p_No=31%2e0000000000000&p_Chart_x0020_Title=&&PageFirstRow=1',
      '/Pages/Aeronautical%20Information/Aeronautical-charts.aspx?Paged=TRUE&p_SortBehavior=1&p_No=30%2e0000000000000&p_Chart_x0020_Title=&p_ID=33&PageFirstRow=31'
    ]

    const airports = []

    for (let i = 0; i < pages.length; i++) {
      const response: AxiosResponse<any> = await instance.get('/Pages/Aeronautical%20Information/Aeronautical-charts.aspx');

      // writeFileSync('/Users/gavinvangent/code/aviation-charts/delete/index.html', response.data, { flag: 'w' })

      const routes = getMatches(AIRPORT_ROUTE_REGEXP, response.data)
        .reduce((carry, current) => {
          if (!carry.includes(current)) {
            carry.push(current)
          }

          return carry
        }, [])

      const pageAirports = routes.map(route => ({
        route: decodeURIComponent(route),
        icao: undefined
      }))

      pageAirports.forEach(airport => {
        airport.icao = getMatches(AIRPORT_ICAO_FROM_ROUTE_REGEXP, airport.route)[0]
        console.log(airport)
        airports.push(airport)
      })
    }

    console.log(airports.length)

    for (let i = 0; i < airports.length; i++) {
      const airport = airports[i]
      if (wantedAirports.includes(airport.icao)) {
        continue
      }

      const response: AxiosResponse<any> = await instance.get(airport.route)
      airport.documents = getMatches(AIRPORT_PDF_LINK_REGEXP, response.data)

      for (let j = 0; j < airport.documents.length; j++) {
        const doc = airport.documents[j]
        const result = await writeDoc(streamInstance, airport, doc)
          .catch(err => {
            console.log('WRITE ERROR', doc)
            throw err
          })
        await delay(500)
        await convert('png', result)
      }
    }

    // '/Pages/Aeronautical%20Information/Aeronautical-charts.aspx'
  }
}

const writeDoc = async function (instance: AxiosInstance, airport: any, route: string): Promise<FileDetail> {
  const dir = `/Users/gavinvangent/code/aviation-charts/delete/pdf/${airport.icao}`
  const toDir = `/Users/gavinvangent/code/aviation-charts/delete/png/${airport.icao}`

  await fs.promises.stat(dir)
    .catch(() => fs.promises.mkdir(dir))

  await fs.promises.stat(toDir)
    .catch(() => fs.promises.mkdir(toDir))

  const nameParts = route.split(/\//g)
  const name = nameParts[nameParts.length - 1].replace(`${airport.icao}_`, '').replace(`${airport.icao}`, '').replace(/^[^a-z|^0-9]/ig, '').replace(/[^a-z|^0-9]+$/gi, '').replace(/\s+/g, '_')
  console.log(name)

  const type = getChartType(name)
  const fileName = `${type}.${name}`
  const fullPath = `${dir}/${fileName}`

  const result = { route, dir, fileName, fullPath, to: `${toDir}/${fileName.replace('.pdf', '.png')}` }

  return fs.promises.stat(fullPath)
    .then(() => {
      return result
    }, () => {
      const writeStream = createWriteStream(fullPath)

      return instance.get(route)
        .then((response: AxiosResponse<any>) => {
          response.data.pipe(writeStream)

          return new Promise((resolve, reject) => {
            writeStream.on('finish', () => resolve(result))
            writeStream.on('error', reject)
          })
        })
    })
}

function getMatches(regExp: RegExp, str: string, index: number = 1) {
  const matches = []
  let match

  while (true) {
    match = regExp.exec(str)

    if (!match) {
      break
    }

    matches.push(match[index])
  }

  return matches
}

const getChartType = function(name: string): ChartType {
  if (/vor|apr|rnav|rnp|ils|ndb|gnss/i.test(name)) {
    return ChartType.APPROACH
  }

  if (/arr/i.test(name)) {
    return ChartType.ARRIVAL
  }

  if (/dep/i.test(name)) {
    return ChartType.DEPARTURE
  }

  return ChartType.INFORMATIONAL
}

enum ChartType {
  INFORMATIONAL = 'INF',
  APPROACH = 'APP',
  ARRIVAL = 'ARR',
  DEPARTURE = 'DEP'
}

const convert = async function(to: string, file: FileDetail) {
  await fs.promises.stat(file.to)
    .then(() => undefined)
    .catch(() => {
      return convertapi.convert(to, { File: file.fullPath })
        .then(result => {
          // get converted file url
          console.log(`Converted file url: ${result.file.url}`)

          // save to file
          return result.file.save(file.to)
        })
        .then(function(file) {
          console.log(`File saved: ${file}`)
        }, err => {
          console.log('ERROR', file.route, file.to, err)
        })
    })
}

interface FileDetail {
  route: string
  dir: string,
  fileName: string,
  fullPath: string,
  to: string
}

const delay = function(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
