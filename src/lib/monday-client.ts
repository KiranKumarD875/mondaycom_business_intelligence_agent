/**
 * Monday.com API Client
 * Handles all interactions with the Monday.com GraphQL API v2
 */

const MONDAY_API_URL = "https://api.monday.com/v2";

export interface MondayBoard {
  id: string;
  name: string;
  description?: string;
  columns: MondayColumn[];
  groups: MondayGroup[];
  items_page?: {
    cursor?: string;
    items: MondayItem[];
  };
}

export interface MondayColumn {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
}

export interface MondayGroup {
  id: string;
  title: string;
  color?: string;
}

export interface MondayItem {
  id: string;
  name: string;
  group?: MondayGroup;
  column_values: MondayColumnValue[];
  created_at?: string;
  updated_at?: string;
}

export interface MondayColumnValue {
  id: string;
  type?: string;
  text?: string | null;
  value?: string | null;
  column?: {
    id: string;
    title: string;
    type: string;
  };
}

export interface BoardData {
  board: MondayBoard;
  items: MondayItem[];
  totalItems: number;
  fetchedAt: string;
  hasErrors: boolean;
  errors: string[];
}

async function mondayGraphQL(
  query: string,
  variables?: Record<string, unknown>
): Promise<{ data?: Record<string, unknown>; errors?: Array<{ message: string }> }> {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) {
    throw new Error("MONDAY_API_KEY environment variable is not set");
  }

  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
      "API-Version": "2024-01",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Monday.com API error: ${response.status} - ${text}`);
  }

  return response.json();
}

/**
 * Fetch all boards accessible to the API token
 */
export async function fetchBoards(): Promise<MondayBoard[]> {
  const query = `
    query {
      boards(limit: 50, order_by: created_at) {
        id
        name
        description
        columns {
          id
          title
          type
          settings_str
        }
        groups {
          id
          title
          color
        }
      }
    }
  `;

  const result = await mondayGraphQL(query);
  if (result.errors?.length) {
    throw new Error(`Monday.com API errors: ${result.errors.map((e) => e.message).join(", ")}`);
  }

  const boards = (result.data as { boards?: MondayBoard[] })?.boards ?? [];
  return boards;
}

/**
 * Fetch all items from a board with pagination
 */
export async function fetchBoardItems(boardId: string): Promise<MondayItem[]> {
  const allItems: MondayItem[] = [];
  let cursor: string | null = null;
  let page = 0;
  const maxPages = 20; // Safety limit

  do {
    page++;
    const cursorParam = cursor ? `cursor: "${cursor}"` : "";
    const query = `
      query {
        boards(ids: [${boardId}]) {
          items_page(limit: 500 ${cursorParam ? `, ${cursorParam}` : ""}) {
            cursor
            items {
              id
              name
              created_at
              updated_at
              group {
                id
                title
                color
              }
              column_values {
                id
                type
                text
                value
                column {
                  id
                  title
                  type
                }
              }
            }
          }
        }
      }
    `;

    const result = await mondayGraphQL(query);

    if (result.errors?.length) {
      console.error("Monday.com API errors:", result.errors);
      break;
    }

    const boardData = (result.data as { boards?: MondayBoard[] })?.boards?.[0];
    const itemsPage = boardData?.items_page;

    if (!itemsPage || !itemsPage.items?.length) break;

    allItems.push(...itemsPage.items);
    cursor = itemsPage.cursor ?? null;

    // If cursor is null or empty, we've fetched all items
    if (!cursor) break;
  } while (page < maxPages);

  return allItems;
}

/**
 * Fetch complete board data including all items
 */
export async function fetchCompleteBoard(boardId: string): Promise<BoardData> {
  const errors: string[] = [];

  try {
    // First fetch board metadata
    const boardsQuery = `
      query {
        boards(ids: [${boardId}]) {
          id
          name
          description
          columns {
            id
            title
            type
            settings_str
          }
          groups {
            id
            title
            color
          }
        }
      }
    `;

    const boardResult = await mondayGraphQL(boardsQuery);
    const board = (boardResult.data as { boards?: MondayBoard[] })?.boards?.[0];

    if (!board) {
      throw new Error(`Board ${boardId} not found`);
    }

    // Then fetch all items
    const items = await fetchBoardItems(boardId);

    return {
      board,
      items,
      totalItems: items.length,
      fetchedAt: new Date().toISOString(),
      hasErrors: errors.length > 0,
      errors,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    errors.push(errMsg);
    throw error;
  }
}

/**
 * Parse a Monday.com item's column values into a clean key-value object
 */
export function parseItemColumns(item: MondayItem): Record<string, string | null> {
  const result: Record<string, string | null> = {
    id: item.id,
    name: item.name,
    group: item.group?.title ?? null,
    created_at: item.created_at ?? null,
    updated_at: item.updated_at ?? null,
  };

  for (const cv of item.column_values) {
    const title = cv.column?.title ?? cv.id;
    const key = title.toLowerCase().replace(/[^a-z0-9]/g, "_");
    result[key] = cv.text ?? null;
  }

  return result;
}

/**
 * Convert board items to a structured dataset for AI analysis
 */
export function boardToDataset(boardData: BoardData): {
  columns: string[];
  rows: Record<string, string | null>[];
  summary: {
    totalRows: number;
    boardName: string;
    fetchedAt: string;
    nullCounts: Record<string, number>;
  };
} {
  const rows = boardData.items.map(parseItemColumns);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  // Count nulls per column for data quality reporting
  const nullCounts: Record<string, number> = {};
  for (const col of columns) {
    nullCounts[col] = rows.filter((r) => r[col] === null || r[col] === "").length;
  }

  return {
    columns,
    rows,
    summary: {
      totalRows: rows.length,
      boardName: boardData.board.name,
      fetchedAt: boardData.fetchedAt,
      nullCounts,
    },
  };
}
