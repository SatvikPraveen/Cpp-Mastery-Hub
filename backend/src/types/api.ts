// File: backend/src/types/api.ts
// Extension: .ts
// Location: backend/src/types/api.ts

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface FilterQuery {
  [key: string]: any;
}

export interface RequestWithPagination extends Request {
  query: PaginationQuery & FilterQuery;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

export interface FileUploadResponse {
  success: boolean;
  file?: {
    id: string;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    url: string;
  };
  error?: string;
}