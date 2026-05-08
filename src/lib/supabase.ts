// Custom client to replace Supabase JS client with our backend API

export const supabase = {
  from: (table: string) => {
    return {
      select: (selectFields: string = '*') => {
        let filters: any[] = [];
        let inFilters: any[] = [];
        let limitVal: number | null = null;
        let orderVal: { column: string, ascending: boolean } | null = null;

        const queryBuilder = {
          eq: (column: string, value: any) => {
            if (value !== undefined && value !== null) {
              filters.push({ column, operator: 'eq', value });
            }
            return queryBuilder;
          },
          gte: (column: string, value: any) => {
            if (value !== undefined && value !== null) {
              filters.push({ column, operator: 'gte', value });
            }
            return queryBuilder;
          },
          lte: (column: string, value: any) => {
            if (value !== undefined && value !== null) {
              filters.push({ column, operator: 'lte', value });
            }
            return queryBuilder;
          },
          in: (column: string, values: any[]) => {
            if (values !== undefined && values !== null) {
              inFilters.push({ column, values });
            }
            return queryBuilder;
          },
          ilike: (column: string, value: string) => {
            if (value !== undefined && value !== null) {
              filters.push({ column, operator: 'ilike', value });
            }
            return queryBuilder;
          },
          or: (value: string) => {
            if (value !== undefined && value !== null) {
              filters.push({ column: '', operator: 'or', value });
            }
            return queryBuilder;
          },
          limit: (count: number) => {
            limitVal = count;
            return queryBuilder;
          },
          order: (column: string, options?: { ascending?: boolean }) => {
            orderVal = { column, ascending: options?.ascending ?? true };
            return queryBuilder;
          },
          then: function<TResult1 = any, TResult2 = never>(
            onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
            onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
          ): Promise<TResult1 | TResult2> {
            return new Promise<any>(async (resolve, reject) => {
              try {
                console.log(`[Supabase Mock] Fetching ${table}...`);
                const response = await fetch('/api/query', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    table,
                    select: selectFields,
                    filters,
                    inFilters,
                    limit: limitVal,
                    order: orderVal
                  })
                });
                
                if (!response.ok) {
                  const errorDetails = await response.text();
                  console.error(`[Supabase Mock] ERRO NO FETCH ${table}:`, errorDetails);
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                console.log(`[Supabase Mock] Success ${table}:`, result.data?.length || 0, "rows");
                resolve(result);
              } catch (error) {
                console.error(`[Supabase Mock] Catch error ${table}:`, error);
                resolve({ data: null, error });
              }
            }).then(onfulfilled, onrejected);
          }
        };

        return queryBuilder;
      }
    };
  }
};
