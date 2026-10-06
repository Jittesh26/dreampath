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
  if (table === schema.interviewSessions) return 'interview_sessions';
  if (table === schema.interviewTranscripts) return 'interview_transcripts';
  if (table === schema.interviewEntities) return 'interview_entities';
  if (table === schema.interviewSlots) return 'interview_slots';
  if (table === schema.interviewFacts) return 'interview_facts';
  if (table === schema.interviewIntents) return 'interview_intents';

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
  interview_sessions: any[] = [];
  interview_transcripts: any[] = [];
  interview_entities: any[] = [];
  interview_slots: any[] = [];
  interview_facts: any[] = [];
  interview_intents: any[] = [];

  getTable(name: string): any[] {
    return (this as any)[name] || [];
  }

  setTable(name: string, data: any[]) {
    (this as any)[name] = data;
  }

  reset() {
    this.users = [...initialUsers];
    this.student_profiles = [...initialStudentProfiles];
    this.providers = [...initialProviders];
    this.scholarships = [...initialScholarships];
    this.intakes = [...initialIntakes];
    this.intake_versions = [...initialIntakeVersions];
    this.requirements = [...initialRequirements];
    this.data_reports = [];
    this.applications = [];
    this.resume_profiles = [];
    this.resume_versions = [];
    this.resume_facts = [];
    this.interview_sessions = [];
    this.interview_transcripts = [];
    this.interview_entities = [];
    this.interview_slots = [];
    this.interview_facts = [];
    this.interview_intents = [];
  }
}

export const inMemoryStore = new MockDatabase();

export function resetInMemoryStore() {
  inMemoryStore.reset();
}

function flattenParamValues(item: any): any[] {
  if (item === null || item === undefined) return [];
  if (Array.isArray(item)) return item.flatMap(flattenParamValues);
  if (typeof item === 'object') {
    if (item.constructor?.name === 'Param' || ('value' in item && !item.queryChunks)) {
      return flattenParamValues(item.value);
    }
  }
  return [item];
}

// Evaluate a filter condition on a row
export function evaluateCondition(row: any, cond: any): boolean {
  if (!cond) return true;

  // Handle Drizzle BinaryOperator / SQL objects
  if (cond.operator && cond.left !== undefined) {
    const leftCol = getColumnName(cond.left);
    const leftVal = leftCol ? row[leftCol] ?? row[leftCol.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())] : undefined;
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
  if (!chunks || chunks.length === 0) return true;

  // If wrapped in parentheses: e.g. ['(', SQL, ')']
  if (
    chunks.length === 3 &&
    (chunks[0] === '(' || chunks[0]?.value?.[0] === '(') &&
    (chunks[2] === ')' || chunks[2]?.value?.[0] === ')') &&
    chunks[1]?.queryChunks
  ) {
    return evaluateQueryChunks(row, chunks[1].queryChunks);
  }

  // Check for top-level logical operators (' or ' / ' and ')
  const orIndices: number[] = [];
  const andIndices: number[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const raw = typeof chunks[i] === 'string' ? chunks[i] : Array.isArray(chunks[i]?.value) ? chunks[i].value.join('') : chunks[i]?.value;
    const text = String(raw || '').trim().toLowerCase();
    if (text === 'or') orIndices.push(i);
    else if (text === 'and') andIndices.push(i);
  }

  if (orIndices.length > 0) {
    const subGroups: any[][] = [];
    let start = 0;
    for (const idx of orIndices) {
      subGroups.push(chunks.slice(start, idx));
      start = idx + 1;
    }
    subGroups.push(chunks.slice(start));
    return subGroups.some(grp => evaluateQueryChunks(row, grp));
  }

  if (andIndices.length > 0) {
    const subGroups: any[][] = [];
    let start = 0;
    for (const idx of andIndices) {
      subGroups.push(chunks.slice(start, idx));
      start = idx + 1;
    }
    subGroups.push(chunks.slice(start));
    return subGroups.every(grp => evaluateQueryChunks(row, grp));
  }

  // Leaf condition evaluation
  let colName: string | null = null;
  let colTable: string | null = null;
  let op = '=';
  const paramValues: any[] = [];

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    if (!chunk) continue;

    // Sub-expression SQL
    if (Array.isArray(chunk.queryChunks)) {
      return evaluateQueryChunks(row, chunk.queryChunks);
    }

    // Column chunk
    if (chunk.name || chunk._?.name || chunk.columnType) {
      colName = getColumnName(chunk);
      colTable = getTableName(chunk.table || chunk._?.table);
      continue;
    }

    // String tokens / StringChunk
    if (typeof chunk === 'string' || chunk.constructor?.name === 'StringChunk' || chunk.value !== undefined && Array.isArray(chunk.value) && typeof chunk.value[0] === 'string') {
      const raw = typeof chunk === 'string' ? chunk : Array.isArray(chunk.value) ? chunk.value.join('') : chunk.value;
      const text = String(raw).trim().toLowerCase();
      if (text.includes('ilike') || text.includes('like')) op = 'ilike';
      else if (text.includes('not in')) op = 'not in';
      else if (text.includes('in')) op = 'in';
      else if (text.includes('!=') || text.includes('<>')) op = '!=';
      else if (text.includes('>=')) op = '>=';
      else if (text.includes('<=')) op = '<=';
      else if (text.includes('>')) op = '>';
      else if (text.includes('<')) op = '<';
      else if (text.includes('=')) op = '=';
      continue;
    }

    // Param chunk or list of params
    if (chunk.constructor?.name === 'Param') {
      paramValues.push(...flattenParamValues(chunk.value));
      continue;
    }
    if (Array.isArray(chunk)) {
      paramValues.push(...flattenParamValues(chunk));
      continue;
    }
  }

  if (colName) {
    let rowVal = undefined;
    if (colTable && colTable !== 'unknown' && row[colTable] && row[colTable][colName] !== undefined) {
      rowVal = row[colTable][colName];
    } else {
      const camelCol = colName.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
      rowVal = row[colName] !== undefined ? row[colName] : row[camelCol];
    }
    if (op === '=') return rowVal == paramValues[0];
    if (op === '!=' || op === '<>') return rowVal != paramValues[0];
    if (op === 'ilike') {
      const pattern = String(paramValues[0] || '').replace(/%/g, '.*');
      return new RegExp(`^${pattern}$`, 'i').test(String(rowVal || ''));
    }
    if (op === 'in') {
      return paramValues.includes(rowVal);
    }
    if (op === 'not in') {
      return !paramValues.includes(rowVal);
    }
    if (op === '>=') return Number(rowVal) >= Number(paramValues[0]);
    if (op === '<=') return Number(rowVal) <= Number(paramValues[0]);
    if (op === '>') return Number(rowVal) > Number(paramValues[0]);
    if (op === '<') return Number(rowVal) < Number(paramValues[0]);
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

    // Apply orderBys
    if (this.orderBys.length > 0) {
      for (const ord of this.orderBys) {
        let colName: string | null = null;
        let isDesc = false;
        if (ord && ord.queryChunks) {
          for (const chunk of ord.queryChunks) {
            const name = getColumnName(chunk);
            if (name) colName = name;
            const text = String(chunk?.value ?? chunk ?? '').toLowerCase();
            if (text.includes('desc')) isDesc = true;
          }
        } else if (ord) {
          colName = getColumnName(ord);
        }

        if (colName) {
          const camel = colName.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
          rows.sort((a, b) => {
            const valA = a[colName] !== undefined ? a[colName] : a[camel];
            const valB = b[colName] !== undefined ? b[colName] : b[camel];
            if (valA === valB) return 0;
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;
            const cmp = valA > valB ? 1 : -1;
            return isDesc ? -cmp : cmp;
          });
        }
      }
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
          const colTable = (col as any)?.table;
          const tblName = getTableName(colTable);
          if (colName) {
            if (tblName && tblName !== 'unknown' && row[tblName] && row[tblName][colName] !== undefined) {
              projected[key] = row[tblName][colName];
            } else {
              projected[key] = row[colName] ?? row[key];
            }
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
  private doNothingOnConflict = false;

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

  onConflictDoNothing() {
    this.doNothingOnConflict = true;
    return this;
  }

  async execute(): Promise<any[]> {
    const table = inMemoryStore.getTable(this.tableName);
    const insertedItems: any[] = [];

    for (const val of this.insertValues) {
      if (this.doNothingOnConflict) {
        const existing = table.find(
          (item: any) =>
            (val.id && item.id === val.id) ||
            (val.email && item.email && item.email.toLowerCase() === val.email.toLowerCase())
        );
        if (existing) {
          continue;
        }
      }

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

  returning() {
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
    interviewSessions: createTableQueryApi('interview_sessions'),
    interviewTranscripts: createTableQueryApi('interview_transcripts'),
    interviewEntities: createTableQueryApi('interview_entities'),
    interviewSlots: createTableQueryApi('interview_slots'),
    interviewFacts: createTableQueryApi('interview_facts'),
    interviewIntents: createTableQueryApi('interview_intents'),
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
