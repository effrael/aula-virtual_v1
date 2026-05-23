---
name: No usar Agent para explorar archivos
description: El usuario no quiere que se use el Agent tool para leer/explorar archivos del proyecto — usar Read/Glob/Grep directamente
type: feedback
---

No usar el Agent tool para explorar archivos del proyecto (leer código, buscar funciones, ver implementaciones).

**Why:** El usuario lo rechazó explícitamente con frustración. Los archivos se deben leer directamente con Read, Glob o Grep, uno a uno si hace falta.

**How to apply:** Siempre usar Read/Glob/Grep directamente. El Agent tool solo es válido para tareas genuinamente complejas que no son exploración de archivos (ej. tareas multi-paso independientes). Para cualquier búsqueda de código o lectura de archivos, usar las herramientas dedicadas directamente.
