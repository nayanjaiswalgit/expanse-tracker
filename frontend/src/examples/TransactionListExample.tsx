import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTransactionQueryState } from '../hooks/useQueryState';
import { apiClient } from '../api';
import type { Transaction, Account, Category } from '../types';

// Example component showing how to use the URL-based query state system
export function TransactionListExample() {
  // This hook manages all URL state: pagination, search, and filters
  const queryState = useTransactionQueryState();

  // Use React Query with the generated API parameters
  const {
    data: transactionData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['transactions', queryState.apiParams],
    queryFn: () => apiClient.getTransactions(queryState.apiParams),
    keepPreviousData: true // Important for smooth pagination
  });

  const transactions = transactionData?.results || [];
  const totalCount = transactionData?.count || 0;

  // Update pagination total count when data changes
  React.useEffect(() => {
    queryState.pagination.setTotalCount?.(totalCount);
  }, [totalCount]);

  // Example of using the query state
  const {
    pagination,
    search,
    filters,
    hasActiveQuery,
    resetAll
  } = queryState;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search transactions..."
            value={search.search}
            onChange={(e) => search.setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {search.isSearching && (
            <div className="text-sm text-gray-500 mt-1">Searching...</div>
          )}
        </div>

        {hasActiveQuery && (
          <button
            onClick={resetAll}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Clear All ({filters.activeFilterCount + (search.hasSearch ? 1 : 0)})
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Transaction Type Filter */}
        <select
          value={filters.filters.transaction_type || ''}
          onChange={(e) => filters.setFilter('transaction_type', e.target.value || undefined)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
          <option value="buy">Buy Investment</option>
          <option value="sell">Sell Investment</option>
          <option value="dividend">Dividend</option>
          <option value="lend">Lend Money</option>
          <option value="borrow">Borrow Money</option>
          <option value="repayment">Repayment</option>
        </select>

        {/* Verified Filter */}
        <select
          value={filters.filters.verified === undefined ? '' : filters.filters.verified.toString()}
          onChange={(e) => {
            const value = e.target.value;
            filters.setFilter('verified', value === '' ? undefined : value === 'true');
          }}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Verification Status</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>

        {/* Date Range */}
        <input
          type="date"
          placeholder="Start Date"
          value={filters.filters.start_date || ''}
          onChange={(e) => filters.setFilter('start_date', e.target.value || undefined)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <input
          type="date"
          placeholder="End Date"
          value={filters.filters.end_date || ''}
          onChange={(e) => filters.setFilter('end_date', e.target.value || undefined)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />

        {/* Clear Filters */}
        {filters.hasActiveFilters && (
          <button
            onClick={filters.clearAllFilters}
            className="px-3 py-2 text-sm text-red-600 hover:text-red-700"
          >
            Clear Filters ({filters.activeFilterCount})
          </button>
        )}
      </div>

      {/* Results Count & Sorting */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {totalCount > 0
            ? `Showing ${pagination.offset + 1}-${Math.min(pagination.offset + pagination.pageSize, totalCount)} of ${totalCount} transactions`
            : 'No transactions found'
          }
        </div>

        <select
          value={filters.filters.ordering || '-date'}
          onChange={(e) => filters.setFilter('ordering', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="-date">Newest First</option>
          <option value="date">Oldest First</option>
          <option value="-amount">Highest Amount</option>
          <option value="amount">Lowest Amount</option>
          <option value="description">Description A-Z</option>
          <option value="-description">Description Z-A</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <div className="mt-2 text-sm text-gray-600">Loading transactions...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            Error loading transactions: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </div>
      )}

      {/* Transaction List */}
      {!isLoading && !error && (
        <div className="space-y-2">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {transaction.description}
                  </div>
                  <div className="text-sm text-gray-500">
                    {transaction.date} • Account: {transaction.account_id}
                    {transaction.verified && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
                <div className={`font-medium ${
                  ['income', 'dividend'].includes(transaction.transaction_type)
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {['income', 'dividend'].includes(transaction.transaction_type) ? '+' : '-'}
                  ${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                </div>
              </div>
            </div>
          ))}

          {transactions.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              {hasActiveQuery
                ? 'No transactions match your current filters.'
                : 'No transactions found.'
              }
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={pagination.previousPage}
              disabled={!pagination.hasPreviousPage}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={pagination.nextPage}
              disabled={!pagination.hasNextPage}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>

          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Page size:</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => pagination.setPageSize(Number(e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={pagination.previousPage}
                  disabled={!pagination.hasPreviousPage}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  ←
                </button>

                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  onClick={pagination.nextPage}
                  disabled={!pagination.hasNextPage}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  →
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}