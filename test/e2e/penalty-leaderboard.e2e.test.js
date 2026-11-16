import test from 'node:test'
import assert from 'node:assert/strict'
import {launchBrowser} from './support/browser.mjs'
import {startTestServer} from './support/testServer.mjs'

test('leaderboard tabs explain weekly bests and display cumulative totals above one round', {timeout:30000}, async()=>{
  const server=await startTestServer({penaltyHandler:async(req,res)=>res.json({configured:true,entries:[{playerId:'ORC-HI',score:req.query.period==='all'?2700:1200}]})})
  let browser
  try {
    browser=await launchBrowser()
    const page=browser.page
    await page.navigate(`${server.baseUrl}/tr/penalti`)
    await page.waitFor("document.querySelector('.pen-board li b')?.textContent==='1200'")
    assert.match(await page.evaluate("document.querySelector('.pen-id-help').textContent"),/en yüksek tur puanı/)
    await page.click('.pen-tabs button:nth-child(2)')
    await page.waitFor("document.querySelector('.pen-board li b')?.textContent==='2700'")
    assert.match(await page.evaluate("document.querySelector('.pen-id-help').textContent"),/haftaki en yüksek puanlarının toplamı/)
    await page.click('.pen-tabs button:first-child')
    await page.waitFor("document.querySelector('.pen-board li b')?.textContent==='1200'")
    await page.navigate(`${server.baseUrl}/en/penalty`)
    await page.click('.pen-tabs button:nth-child(2)')
    await page.waitFor("document.querySelector('.pen-board li b')?.textContent==='2700'")
    assert.match(await page.evaluate("document.querySelector('.pen-id-help').textContent"),/sum of your weekly best/)
  } finally {
    await browser?.close()
    await server.close()
  }
})
