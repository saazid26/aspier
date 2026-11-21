export type Role = 'student'|'instructor'|'admin'|'superadmin';
export interface User { _id:string; name:string; email:string; role:Role }
