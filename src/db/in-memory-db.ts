import * as schema from './schema';
import {
  initialProviders,
  initialScholarships,
  initialIntakes,
  initialIntakeVersions,
  initialRequirements,
  initialUsers,
  initialStudentProfiles,
} from './initial-data';

// Table name resolution
export function getTableName(table: any): string {
  if (!table) return 'unknown';
  if (table === schema.users) return 'users';
  if (table === schema.studentProfiles) return 'student_profiles';
  if (table === schema.providers) return 'providers';
  if (table === schema.scholarships) return 'scholarships';
  if (table === schema.intakes) return 'intakes';
  if (table === schema.intakeVersions) return 'intake_versions';
  if (table === schema.dataReports) return 'data_reports';
  if (table === schema.applications) return 'applications';
  if (table === schema.requirements) return 'requirements';
  if (table === schema.resumeProfiles) return 'resume_profiles';
  if (table === schema.resumeVersions) return 'resume_versions';
  if (table === schema.resumeFacts) return 'resume_facts';

  if (table?.name) return table.name;
  if (table?._?.name) return table._.name;
  return 'unknown';
}

function getColumnName(col: any): string | null {
  if (!col) return null;
  if (typeof col === 'string') return col;
  if (col.name) return col.name;
  if (col._?.name) return col._.name;
  if (col.fieldName) return col.fieldName;
  return null;
}

// In-memory data tables
export class MockDatabase {
  users = [...initialUsers];
  student_profiles = [...initialStudentProfiles];
  providers = [...initialProviders];
  scholarships = [...initialScholarships];
  intakes = [...initialIntakes];
  intake_versions = [...initialIntakeVersions];
  requirements = [...initialRequirements];
  data_reports: any[] = [];
  applications: any[] = [];
  resume_profiles: any[] = [];
  resume_versions: any[] = [];
  resume_facts: any[] = [];

  getTable(name: string): any[] {
    return (this as any)[name] || [];
  }

  setTable(name: string, data: any[]) {
    (this as any)[name] = data;
  }
}

export const inMemoryStore = new MockDatabase();

// Evaluate a filter condition on a row
function evaluateCondition(row: any, cond: any): boolean {
  if (!cond) return true;

  // Handle Drizzle BinaryOperator / SQL objects
  // BinaryOperator often has { operator, left, right }
  if (cond.operator && cond.left !== undefined) {
    const leftCol = getColumnName(cond.left);
    const leftVal = leftCol ? row[leftCol] ?? row[leftCol.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] : undefined;
    let rightVal = cond.right;
    if (rightVal && typeof rightVal === 'object' && 'value' in rightVal) {
      rightVal = rightVal.value;
    }

    switch (cond.operator) {
      case '=':
        return leftVal == rightVal;
      case '!=':
      case '<>':
        return leftVal != rightVal;
      case 'like':
      case 'ilike': {
        const pattern = String(rightVal || '').replace(/%/g, '.*');
        return new RegExp(`^${pattern}$`, 'i').test(String(leftVal || ''));
      }
      case 'in':
        return Array.isArray(rightVal) && rightVal.includes(leftVal);
      case 'not in':
        return Array.isArray(rightVal) && !rightVal.includes(leftVal);
      case '>=':
        return Number(leftVal) >= Number(rightVal);
      case '<=':
        return Number(leftVal) <= Number(rightVal);
      case '>':
        return Number(leftVal) > Number(rightVal);
      case '<':
        return Number(leftVal) < Number(rightVal);
    }
  }

  // Handle SQL expression chunks (Drizzle SQL)
  if (Array.isArray(cond.queryChunks)) {
    return evaluateQueryChunks(row, cond.queryChunks);
  }

  // Handle and/or logical operators
  if (Array.isArray(cond)) {
    return cond.every(c => evaluateCondition(row, c));
  }

  return true;
}

function evaluateQueryChunks(row: any, chunks: any[]): boolean {
  // Try to extract columns, values, and operators from Drizzle SQL queryChunks
  let colName: string | null = null;
  let op = '=';
  let val: any = undefined;

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    if (!chunk) continue;

    // String tokens
    if (typeof chunk === 'string' || (chunk.value && typeof chunk.value === 'string')) {
      const text = (typeof chunk === 'string' ? chunk : chunk.value).trim().toLowerCase();
      if (text === 'ilike' || text === 'like') op = 'ilike';
      else if (text === '=') op = '=';
      else if (text === 'in') op = 'in';
      else if (text === 'not in') op = 'not in';
      else if (text === '>=') op = '>=';
      else if (text === '<=') op = '<=';
    }

    // Column chunk
    if (chunk.name || chunk._?.name) {
      colName = getColumnName(chunk);
    }

    // Param chunk
    if (chunk.value !== undefined && typeof chunk !== 'string') {
      val = chunk.value;
    }

    // Array / Expression chunks
    if (Array.isArray(chunk.queryChunks)) {
      // Sub-expression
      return evaluateQueryChunks(row, chunk.queryChunks);
    }
  }

  if (colName) {
    const rowVal = row[colName] ?? row[colName.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
    if (op === '=') return rowVal == val;
    if (op === 'ilike') {
      const pattern = String(val || '').replace(/%/g, '.*');
      return new RegExp(`^${pattern}$`, 'i').test(String(rowVal || ''));
    }
    if (op === 'in') {
      const arr = Array.isArray(val) ? val : [];
      return arr.includes(rowVal);
    }
    if (op === '>=') return Number(rowVal) >= Number(val);
    if (op === '<=') return Number(rowVal) <= Number(val);
  }

  return true;
}

// Chainable Query Builder for db.select()
export class MockSelectQueryBuilder {
  private selectedFields: any;
  private fromTable: string = '';
  private joins: Array<{ table: string; on: any }> = [];
  private whereCondition: any = null;
  private orderBys: any[] = [];
  private limitCount?: number;

  constructor(fields?: any) {
    this.selectedFields = fields;
  }

  from(table: any) {
    this.fromTable = getTableName(table);
    return this;
  }

  innerJoin(table: any, on: any) {
    this.joins.push({ table: getTableName(table), on });
    return this;
  }

  leftJoin(table: any, on: any) {
    this.joins.push({ table: getTableName(table), on });
    return this;
  }

  where(condition: any) {
    this.whereCondition = condition;
    return this;
  }

  orderBy(...orderBys: any[]) {
    this.orderBys = orderBys;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async execute(): Promise<any[]> {
    let rows = inMemoryStore.getTable(this.fromTable).map(item => ({ ...item }));

    // Apply Joins
    for (const join of this.joins) {
      const joinData = inMemoryStore.getTable(join.table);
      const joinedRows: any[] = [];

      for (const row of rows) {
        // Find matching join row
        let match = null;
        if (this.fromTable === 'scholarships' && join.table === 'providers') {
          match = joinData.find(p => p.id === row.providerId);
        } else if (this.fromTable === 'scholarships' && join.table === 'intakes') {
          match = joinData.find(i => i.scholarshipId === row.id);
        } else if (this.fromTable === 'applications' && join.table === 'intakes') {
          match = joinData.find(i => i.id === row.intakeId);
        } else if (join.table === 'scholarships' && row.scholarshipId) {
          match = joinData.find(s => s.id === row.scholarshipId);
        } else if (join.table === 'providers' && row.providerId) {
          match = joinData.find(p => p.id === row.providerId);
        } else {
          // General join matching: match on common id/foreignKey
          match = joinData.find(j => {
            return (
              j.id === row[`${join.table.replace(/s$/, '')}Id`] ||
              j[`${this.fromTable.replace(/s$/, '')}Id`] === row.id
            );
          });
        }

        if (match) {
          // If no specific projection, create combined object with namespaced keys
          // e.g. { scholarships: { ... }, providers: { ... } }
          const combined = {
            ...row,
            ...match,
            [this.fromTable]: { ...row },
            [join.table]: { ...match },
          };
          joinedRows.push(combined);
        }
      }
      rows = joinedRows;
    }

    // Apply where filter
    if (this.whereCondition) {
      rows = rows.filter(row => evaluateCondition(row, this.whereCondition));
    }

    // Apply limit
    if (this.limitCount !== undefined) {
      rows = rows.slice(0, this.limitCount);
    }

    // Shape results if selectedFields provided
    if (this.selectedFields && typeof this.selectedFields === 'object') {
      // Check for count aggregate: db.select({ value: count() }).from(...)
      if ('value' in this.selectedFields) {
        return [{ value: rows.length }];
      }

      return rows.map(row => {
        const projected: Record<string, any> = {};
        for (const [key, col] of Object.entries(this.selectedFields)) {
          const colName = getColumnName(col);
          if (colName) {
            projected[key] = row[colName] ?? row[key];
          } else {
            projected[key] = row[key];
          }
        }
        return projected;
      });
    }

    // If query was db.select().from(scholarships).innerJoin(providers, ...)
    // Next.js expects { scholarships: { ... }, providers: { ... } } if it was joined
    if (this.joins.length > 0 && !this.selectedFields) {
      return rows.map(r => ({
        [this.fromTable]: r[this.fromTable] || r,
        ...this.joins.reduce((acc, j) => {
          acc[j.table] = r[j.table];
          return acc;
        }, {} as any),
      }));
    }

    return rows;
  }

  // Make query builder thenable (awaitable)
  then<TResult1 = any[], TResult2 = never>(
    onfulfilled?: ((value: any[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Chainable Insert Builder
export class MockInsertBuilder {
  private tableName: string;
  private insertValues: any[] = [];

  constructor(table: any) {
    this.tableName = getTableName(table);
  }

  values(vals: any | any[]) {
    this.insertValues = Array.isArray(vals) ? vals : [vals];
    return this;
  }

  returning() {
    return this;
  }

  async execute(): Promise<any[]> {
    const table = inMemoryStore.getTable(this.tableName);
    const insertedItems: any[] = [];

    for (const val of this.insertValues) {
      const item = {
        id: val.id || crypto.randomUUID(),
        ...val,
        createdAt: val.createdAt || new Date(),
        updatedAt: val.updatedAt || new Date(),
      };
      table.push(item);
      insertedItems.push(item);
    }

    return insertedItems;
  }

  then<TResult1 = any[], TResult2 = never>(
    onfulfilled?: ((value: any[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Chainable Update Builder
export class MockUpdateBuilder {
  private tableName: string;
  private updateData: any = {};
  private whereCondition: any = null;

  constructor(table: any) {
    this.tableName = getTableName(table);
  }

  set(data: any) {
    this.updateData = data;
    return this;
  }

  where(condition: any) {
    this.whereCondition = condition;
    return this;
  }

  returning() {
    return this;
  }

  async execute(): Promise<any[]> {
    const table = inMemoryStore.getTable(this.tableName);
    const updatedItems: any[] = [];

    for (let i = 0; i < table.length; i++) {
      if (evaluateCondition(table[i], this.whereCondition)) {
        table[i] = {
          ...table[i],
          ...this.updateData,
          updatedAt: new Date(),
        };
        updatedItems.push(table[i]);
      }
    }

    return updatedItems;
  }

  then<TResult1 = any[], TResult2 = never>(
    onfulfilled?: ((value: any[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Chainable Delete Builder
export class MockDeleteBuilder {
  private tableName: string;
  private whereCondition: any = null;

  constructor(table: any) {
    this.tableName = getTableName(table);
  }

  where(condition: any) {
    this.whereCondition = condition;
    return this;
  }

  async execute(): Promise<any[]> {
    const table = inMemoryStore.getTable(this.tableName);
    const remaining: any[] = [];
    const deleted: any[] = [];

    for (const item of table) {
      if (evaluateCondition(item, this.whereCondition)) {
        deleted.push(item);
      } else {
        remaining.push(item);
      }
    }

    inMemoryStore.setTable(this.tableName, remaining);
    return deleted;
  }

  then<TResult1 = any[], TResult2 = never>(
    onfulfilled?: ((value: any[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Drizzle .query API Mock
function createTableQueryApi(tableName: string) {
  return {
    async findFirst(opts?: { where?: any; orderBy?: any }) {
      const table = inMemoryStore.getTable(tableName);
      let items = [...table];
      if (opts?.where) {
        items = items.filter(item => evaluateCondition(item, opts.where));
      }
      return items[0] || null;
    },
    async findMany(opts?: { where?: any; orderBy?: any }) {
      const table = inMemoryStore.getTable(tableName);
      let items = [...table];
      if (opts?.where) {
        items = items.filter(item => evaluateCondition(item, opts.where));
      }
      return items;
    },
  };
}

export function createInMemoryDrizzle() {
  const query = {
    users: createTableQueryApi('users'),
    studentProfiles: createTableQueryApi('student_profiles'),
    providers: createTableQueryApi('providers'),
    scholarships: createTableQueryApi('scholarships'),
    intakes: createTableQueryApi('intakes'),
    intakeVersions: createTableQueryApi('intake_versions'),
    requirements: createTableQueryApi('requirements'),
    applications: createTableQueryApi('applications'),
    resumeProfiles: createTableQueryApi('resume_profiles'),
    resumeVersions: createTableQueryApi('resume_versions'),
    resumeFacts: createTableQueryApi('resume_facts'),
    dataReports: createTableQueryApi('data_reports'),
  };

  return {
    query,
    select: (fields?: any) => new MockSelectQueryBuilder(fields),
    insert: (table: any) => new MockInsertBuilder(table),
    update: (table: any) => new MockUpdateBuilder(table),
    delete: (table: any) => new MockDeleteBuilder(table),
  } as any;
}
