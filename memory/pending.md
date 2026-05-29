Usuarios:
                                                            
  Menor / opcional:
  4. Exportar usuarios a Excel/CSV (para respaldo o reportes)
  5. Ver perfil de usuario — una vista detallada con sus cursos, progreso, certificados 


  -----------

   Auditoría del módulo de certificados                                                                                                      
                                                                                                                                            
  Lo que está roto o falta                                                                                                                  
                                                                                                                                            
  TemplateCard    
  - Solo tiene "Diseñar" en el dropdown — no hay "Renombrar" ni "Eliminar", aunque la action deleteCertificateTemplate ya existe

  CreateTemplateDialog
  - MediaPicker con accept="all" — acepta cualquier archivo, no solo PDFs

  generateCertificate (auto-emisión)
  - Toma la primera plantilla disponible sin importar el curso
  - No previene duplicados — mismo alumno + mismo curso puede recibir N certificados
  - Los campos custom del template quedarían vacíos

  IssueCertificateDialog (emisión manual)
  - No filtra los alumnos por los inscritos en el curso seleccionado — muestra todos los alumnos
  - No previene duplicados tampoco

  Ausente completamente
  - Asociación curso → plantilla específica
  - Campos custom del template configurables por curso

  ---
  Lo que SÍ está bien

  - Designer (pdfme) funcionando
  - Verificación pública /verify/[code] completa
  - Vista del alumno con descarga y link de verificación
  - getCertificateByCode, getCertificatesByStudent, stats — correctos
  - El flujo de emisión automática al aprobar quiz de certificación — la lógica es correcta, solo le falta el template correcto

  ---
  ¿Quieres que resuelva todo esto en un solo pase? El orden lógico sería:

  1. Arreglar TemplateCard (renombrar + eliminar)
  2. Arreglar MediaPicker (solo PDF)
  3. Prevención de duplicados en generateCertificate
  4. Filtrar alumnos por curso en IssueCertificateDialog
  5. Agregar certificate_template_id + certificate_custom_inputs a courses → migration + editor del curso → emisión automática correcta
  
  ----------