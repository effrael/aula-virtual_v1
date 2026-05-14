import type { UserRow } from "./users-table";

export const docentes: UserRow[] = [
  { id: "1", full_name: "Ana Torres", email: "ana@escuela.com", joined: "12 may 2026", status: "activo" },
  { id: "2", full_name: "Luis García", email: "luis@escuela.com", joined: "10 may 2026", status: "activo" },
  { id: "3", full_name: "Carmen Ruiz", email: "carmen@escuela.com", joined: "08 may 2026", status: "activo" },
  { id: "4", full_name: "Jorge Mendoza", email: "jorge@escuela.com", joined: "05 may 2026", status: "inactivo" },
  { id: "5", full_name: "Patricia Soto", email: "patricia@escuela.com", joined: "01 may 2026", status: "activo" },
  { id: "6", full_name: "Roberto Díaz", email: "roberto@escuela.com", joined: "28 abr 2026", status: "activo" },
  { id: "7", full_name: "Sandra Vega", email: "sandra@escuela.com", joined: "25 abr 2026", status: "inactivo" },
];

export const alumnos: UserRow[] = [
  { id: "1", full_name: "Luis Medina", email: "lmedina@escuela.com", joined: "12 may 2026", status: "activo" },
  { id: "2", full_name: "María López", email: "mlopez@escuela.com", joined: "11 may 2026", status: "activo" },
  { id: "3", full_name: "Carlos Pérez", email: "cperez@escuela.com", joined: "10 may 2026", status: "activo" },
  { id: "4", full_name: "Rosa Flores", email: "rflores@escuela.com", joined: "09 may 2026", status: "inactivo" },
  { id: "5", full_name: "Diego Ramírez", email: "dramirez@escuela.com", joined: "07 may 2026", status: "activo" },
  { id: "6", full_name: "Valeria Cruz", email: "vcruz@escuela.com", joined: "05 may 2026", status: "activo" },
  { id: "7", full_name: "Andrés Quispe", email: "aquispe@escuela.com", joined: "03 may 2026", status: "activo" },
  { id: "8", full_name: "Lucía Herrera", email: "lherrera@escuela.com", joined: "01 may 2026", status: "inactivo" },
];

export const colaboradores: UserRow[] = [
  { id: "1", full_name: "Marco Silva", email: "marco@escuela.com", joined: "10 may 2026", status: "activo" },
  { id: "2", full_name: "Elena Campos", email: "elena@escuela.com", joined: "05 may 2026", status: "activo" },
  { id: "3", full_name: "Raúl Benítez", email: "raul@escuela.com", joined: "01 may 2026", status: "inactivo" },
];
