import { IEditorOption, IElement, RowFlex } from '..'
import { ZERO } from '../dataset/constant/Common'
import { TEXTLIKE_ELEMENT_TYPE } from '../dataset/constant/Element'
import { ElementType } from '../dataset/enum/Element'
import { DeepRequired } from '../interface/Common'
import { zipElementList } from './element'

export function writeClipboardItem(text: string, html: string) {
  if (!text || !html) return
  const plainText = new Blob([text], { type: 'text/plain' })
  const htmlText = new Blob([html], { type: 'text/html' })
  if (window.ClipboardItem) {
    // @ts-ignore
    const item = new ClipboardItem({
      [plainText.type]: plainText,
      [htmlText.type]: htmlText
    })
    window.navigator.clipboard.write([item])
  } else {
    const fakeElement = document.createElement('div')
    fakeElement.setAttribute('contenteditable', 'true')
    fakeElement.innerHTML = html
    document.body.append(fakeElement)
    // add new range
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(fakeElement)
    selection?.removeAllRanges()
    selection?.addRange(range)
    document.execCommand('copy')
    fakeElement.remove()
  }
}

export function writeElementList(elementList: IElement[], options: DeepRequired<IEditorOption>) {
  const clipboardDom: HTMLDivElement = document.createElement('div')
  function buildDomFromElementList(payload: IElement[]) {
    for (let e = 0; e < payload.length; e++) {
      const element = payload[e]
      // 构造表格
      if (element.type === ElementType.TABLE) {
        const tableDom: HTMLTableElement = document.createElement('table')
        const trList = element.trList!
        for (let t = 0; t < trList.length; t++) {
          const trDom = document.createElement('tr')
          const tr = trList[t]
          for (let d = 0; d < tr.tdList.length; d++) {
            const tdDom = document.createElement('td')
            tdDom.style.border = '1px solid'
            const td = tr.tdList[d]
            tdDom.innerText = td.value[0]?.value || ''
            trDom.append(tdDom)
          }
          tableDom.append(trDom)
        }
        clipboardDom.append(tableDom)
      } else if (element.type === ElementType.HYPERLINK) {
        const a = document.createElement('a')
        a.innerText = element.valueList![0].value
        if (element.url) {
          a.href = element.url
        }
        clipboardDom.append(a)
      } else if (element.type === ElementType.IMAGE) {
        const img = document.createElement('img')
        if (element.value) {
          img.src = element.value
          img.width = element.width!
          img.height = element.height!
        }
        clipboardDom.append(img)
      } else if (element.type === ElementType.SEPARATOR) {
        const hr = document.createElement('hr')
        clipboardDom.append(hr)
      } else if (
        !element.type
        || element.type === ElementType.LATEX
        || TEXTLIKE_ELEMENT_TYPE.includes(element.type)
      ) {
        let text = ''
        if (element.type === ElementType.CONTROL) {
          text = element.control!.value?.[0]?.value || ''
        } else if (element.type === ElementType.DATE) {
          text = element.valueList?.map(v => v.value).join('') || ''
        } else {
          text = element.value
        }
        if (!text) continue
        const isBlock = element.rowFlex === RowFlex.CENTER || element.rowFlex === RowFlex.RIGHT
        const dom = document.createElement(isBlock ? 'p' : 'span')
        dom.innerText = text.replace(new RegExp(`${ZERO}`, 'g'), '\n')
        dom.style.fontFamily = element.font || options.defaultFont
        if (element.rowFlex) {
          dom.style.textAlign = element.rowFlex
        }
        if (element.color) {
          dom.style.color = element.color
        }
        if (element.bold) {
          dom.style.fontWeight = '600'
        }
        if (element.italic) {
          dom.style.fontStyle = 'italic'
        }
        if (element.size) {
          dom.style.fontSize = `${element.size}px`
        }
        clipboardDom.append(dom)
      }
    }
  }
  buildDomFromElementList(zipElementList(elementList))
  // 写入剪贴板
  document.body.append(clipboardDom)
  const text = clipboardDom.innerText
  // 先追加后移除，否则innerText无法解析换行符
  clipboardDom.remove()
  const html = clipboardDom.innerHTML
  if (!text || !html) return
  writeClipboardItem(text, html)
}

export function getElementListByHTML(htmlText: string): IElement[] {
  const elementList: IElement[] = []
  function findTextNode(dom: Element | Node) {
    if (dom.nodeType === 3) {
      const style = window.getComputedStyle(dom.parentNode as Element)
      const value = dom.textContent
      if (value) {
        elementList.push({
          value,
          color: style.color,
          bold: Number(style.fontWeight) > 500,
          italic: style.fontStyle.includes('italic'),
          size: Math.floor(Number(style.fontSize.replace('px', '')))
        })
      }
    } else if (dom.nodeType === 1) {
      const childNodes = dom.childNodes
      for (let n = 0; n < childNodes.length; n++) {
        const node = childNodes[n]
        // br元素与display:block元素需换行
        if (node.nodeName === 'BR') {
          elementList.push({
            value: '\n'
          })
        } else if (node.nodeName === 'A') {
          const aElement = node as HTMLLinkElement
          const value = aElement.innerText
          if (value) {
            elementList.push({
              type: ElementType.HYPERLINK,
              value: '',
              valueList: [{
                value
              }],
              url: aElement.href
            })
          }
        } else {
          findTextNode(node)
          if (node.nodeType === 1 && n !== childNodes.length - 1) {
            const display = window.getComputedStyle(node as Element).display
            if (display === 'block') {
              elementList.push({
                value: '\n'
              })
            }
          }
        }
      }
    }
  }
  // 追加dom
  const clipboardDom = document.createElement('div')
  clipboardDom.innerHTML = htmlText
  document.body.appendChild(clipboardDom)
  const deleteNodes: ChildNode[] = []
  clipboardDom.childNodes.forEach(child => {
    if (child.nodeType !== 1) {
      deleteNodes.push(child)
    }
  })
  deleteNodes.forEach(node => node.remove())
  // 搜索文本节点
  findTextNode(clipboardDom)
  // 移除dom
  clipboardDom.remove()
  return elementList
}
