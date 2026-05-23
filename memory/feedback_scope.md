---
name: No tocar archivos fuera del scope pedido
description: El usuario se molesta cuando se modifican archivos que no fueron solicitados explícitamente
type: feedback
---

Solo modificar los archivos que el usuario pidió explícitamente. No alterar componentes, layouts u otros archivos existentes como efecto secundario de una tarea.

**Why:** El usuario pidió solo implementar el dashboard del superadmin, pero se modificaron también app-sidebar.tsx y nav-user.tsx sin autorización, lo cual fue mal recibido.

**How to apply:** Antes de modificar cualquier archivo, verificar que fue mencionado explícitamente en el pedido. Si se necesita modificar un archivo adicional para que algo funcione, preguntar primero.
