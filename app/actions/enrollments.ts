"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type EnrollmentActionResult =
  | { success?: boolean; message?: string }
  | undefined;

function revalidateCourse(courseId: string) {
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function enrollStudent(
  courseId: string,
  studentId: string
): Promise<EnrollmentActionResult> {
  const { error } = await supabaseAdmin
    .from("enrollments")
    .insert({ course_id: courseId, student_id: studentId });

  if (error) {
    console.error("[enrollStudent]", error.message);
    if (error.code === "23505") {
      return { message: "El alumno ya está inscrito en este curso." };
    }
    return { message: "No se pudo inscribir al alumno." };
  }

  revalidateCourse(courseId);
  return { success: true };
}

export async function unenrollStudent(
  enrollmentId: string,
  courseId: string
): Promise<EnrollmentActionResult> {
  const { error } = await supabaseAdmin
    .from("enrollments")
    .delete()
    .eq("id", enrollmentId);

  if (error) {
    console.error("[unenrollStudent]", error.message);
    return { message: "No se pudo quitar al alumno del curso." };
  }

  revalidateCourse(courseId);
  return { success: true };
}
