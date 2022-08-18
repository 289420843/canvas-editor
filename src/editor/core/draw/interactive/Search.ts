import { ZERO } from '../../../dataset/constant/Common'
import { TEXTLIKE_ELEMENT_TYPE } from '../../../dataset/constant/Element'
import { ControlComponent } from '../../../dataset/enum/Control'
import { EditorContext } from '../../../dataset/enum/Editor'
import { ElementType } from '../../../dataset/enum/Element'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { ISearchResult, ISearchResultRestArgs } from '../../../interface/Search'
import { getUUID } from '../../../utils'
import { Position } from '../../position/Position'
import { Draw } from '../Draw'

export class Search {

  private draw: Draw
  private options: Required<IEditorOption>
  private position: Position
  private searchMatchList: ISearchResult[]

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.position = draw.getPosition()
    this.searchMatchList = []
  }

  public getSearchMatchList(): ISearchResult[] {
    return this.searchMatchList
  }

  public compute(payload: string) {
    const searchMatchList: ISearchResult[] = []
    // 分组
    const elementListGroup: { type: EditorContext, elementList: IElement[], index: number }[] = []
    const originalElementList = this.draw.getOriginalElementList()
    const originalElementListLength = originalElementList.length
    // 查找表格所在位置
    const tableIndexList = []
    for (let e = 0; e < originalElementListLength; e++) {
      const element = originalElementList[e]
      if (element.type === ElementType.TABLE) {
        tableIndexList.push(e)
      }
    }
    let i = 0
    let elementIndex = 0
    while (elementIndex < originalElementListLength - 1) {
      const endIndex = tableIndexList.length ? tableIndexList[i] : originalElementListLength
      const pageElement = originalElementList.slice(elementIndex, endIndex)
      if (pageElement.length) {
        elementListGroup.push({
          index: elementIndex,
          type: EditorContext.PAGE,
          elementList: pageElement
        })
      }
      const tableElement = originalElementList[endIndex]
      if (tableElement) {
        elementListGroup.push({
          index: endIndex,
          type: EditorContext.TABLE,
          elementList: [tableElement]
        })
      }
      elementIndex = endIndex + 1
      i++
    }
    // 搜索文本
    function searchClosure(payload: string | null, type: EditorContext, elementList: IElement[], restArgs?: ISearchResultRestArgs) {
      if (!payload) return
      const text = elementList
        .map(e => !e.type || (TEXTLIKE_ELEMENT_TYPE.includes(e.type) && e.controlComponent !== ControlComponent.CHECKBOX)
          ? e.value
          : ZERO)
        .filter(Boolean)
        .join('')
      const matchStartIndexList = []
      let index = text.indexOf(payload)
      while (index !== -1) {
        matchStartIndexList.push(index)
        index = text.indexOf(payload, index + 1)
      }
      for (let m = 0; m < matchStartIndexList.length; m++) {
        const startIndex = matchStartIndexList[m]
        const groupId = getUUID()
        for (let i = 0; i < payload.length; i++) {
          const index = startIndex + i + (restArgs?.startIndex || 0)
          searchMatchList.push({
            type,
            index,
            groupId,
            ...restArgs
          })
        }
      }
    }
    for (let e = 0; e < elementListGroup.length; e++) {
      const group = elementListGroup[e]
      if (group.type === EditorContext.TABLE) {
        const tableElement = group.elementList[0]
        for (let t = 0; t < tableElement.trList!.length; t++) {
          const tr = tableElement.trList![t]
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const restArgs: ISearchResultRestArgs = {
              tableIndex: group.index,
              trIndex: t,
              tdIndex: d,
              tdId: td.id
            }
            searchClosure(payload, group.type, td.value, restArgs)
          }
        }
      } else {
        searchClosure(payload, group.type, group.elementList, {
          startIndex: group.index
        })
      }
    }
    this.searchMatchList = searchMatchList
  }

  public render(ctx: CanvasRenderingContext2D, pageIndex: number) {
    if (!this.searchMatchList || !this.searchMatchList.length) return
    const { searchMatchAlpha, searchMatchColor } = this.options
    const positionList = this.position.getOriginalPositionList()
    const elementList = this.draw.getOriginalElementList()
    ctx.save()
    ctx.globalAlpha = searchMatchAlpha
    ctx.fillStyle = searchMatchColor
    for (let s = 0; s < this.searchMatchList.length; s++) {
      const searchMatch = this.searchMatchList[s]
      let position: IElementPosition | null = null
      if (searchMatch.type === EditorContext.TABLE) {
        const { tableIndex, trIndex, tdIndex, index } = searchMatch
        position = elementList[tableIndex!]?.trList![trIndex!].tdList[tdIndex!]?.positionList![index]
      } else {
        position = positionList[searchMatch.index]
      }
      if (!position) continue
      const { coordinate: { leftTop, leftBottom, rightTop }, pageNo } = position
      if (pageNo !== pageIndex) continue
      const x = leftTop[0]
      const y = leftTop[1]
      const width = rightTop[0] - leftTop[0]
      const height = leftBottom[1] - leftTop[1]
      ctx.fillRect(x, y, width, height)
    }
    ctx.restore()
  }

}