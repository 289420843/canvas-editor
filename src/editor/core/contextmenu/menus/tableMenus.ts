import { IRegisterContextMenu } from "../../../interface/contextmenu/ContextMenu"
import { Command } from "../../command/Command"

export const tableMenus: IRegisterContextMenu[] = [
  {
    isDivider: true
  },
  {
    name: '插入行列',
    icon: 'insert-row-col',
    when: (payload) => {
      return !payload.isReadonly && payload.isInTable
    },
    childMenus: [
      {
        name: '上方插入1行',
        icon: 'insert-top-row',
        when: () => true,
        callback: (command: Command) => {
          command.executeInsertTableTopRow()
        }
      },
      {
        name: '下方插入1行',
        icon: 'insert-bottom-row',
        when: () => true,
        callback: (command: Command) => {
          command.executeInsertTableBottomRow()
        }
      },
      {
        name: '左侧插入1列',
        icon: 'insert-left-col',
        when: () => true,
        callback: (command: Command) => {
          command.executeInsertTableLeftCol()
        }
      },
      {
        name: '右侧插入1列',
        icon: 'insert-right-col',
        when: () => true,
        callback: (command: Command) => {
          command.executeInsertTableRightCol()
        }
      }
    ]
  },
  {
    name: '删除行列',
    icon: 'delete-row-col',
    when: (payload) => {
      return !payload.isReadonly && payload.isInTable
    },
    childMenus: [
      {
        name: '删除1行',
        icon: 'delete-row',
        when: () => true,
        callback: (command: Command) => {
          command.executeDeleteTableRow()
        }
      },
      {
        name: '删除一列',
        icon: 'delete-col',
        when: () => true,
        callback: (command: Command) => {
          command.executeDeleteTableCol()
        }
      },
      {
        name: '删除整个表格',
        icon: 'delete-table',
        when: () => true,
        callback: (command: Command) => {
          command.executeDeleteTable()
        }
      }
    ]
  },
  {
    name: '合并单元格',
    icon: 'merge-cell',
    when: (payload) => {
      return !payload.isReadonly && payload.isCrossRowCol
    },
    callback: (command: Command) => {
      command.executeMergeTableCell()
    }
  },
  {
    name: '取消合并',
    icon: 'merge-cancel-cell',
    when: (payload) => {
      return !payload.isReadonly && payload.isInTable
    },
    callback: (command: Command) => {
      command.executeCancelMergeTableCell()
    }
  }
]