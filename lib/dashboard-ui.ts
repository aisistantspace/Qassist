/** Shared dashboard UI class tokens — uniform 5px radius, pro surfaces */
export const ui = {
  card: 'bg-white rounded-lg border border-gray-200 shadow-sm',
  cardPad: 'p-5',
  filterCard: 'bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-6',
  tableShell: 'bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden',
  statCard: 'bg-white rounded-lg border border-gray-200 shadow-sm p-4',
  pageTitle: 'text-2xl font-bold text-gray-900 tracking-tight',
  pageSubtitle: 'text-sm text-gray-600 mt-1',
  input:
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500',
  select:
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500',
  btnPrimary:
    'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  btnSecondary:
    'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors',
  btnDanger:
    'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors',
  btnGhost:
    'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors',
  tableHead: 'bg-gray-50/90 border-b border-gray-200',
  th: 'px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap',
  td: 'px-4 py-3 text-sm align-middle',
  row: 'hover:bg-gray-50/80 transition-colors',
  rowSelected: 'bg-primary-50/50',
  menuTrigger:
    'inline-flex items-center justify-center w-9 h-9 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors',
  menuPanel:
    'absolute z-30 mt-1 min-w-[11rem] py-1 bg-white border border-gray-200 rounded-lg shadow-lg',
} as const
