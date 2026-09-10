import prisma from "@/lib/prisma";
export async function evaluateStudentGrade(schoolId: string, percentage: number) {
  const scales = await prisma.gradingScale.findMany({ where: { schoolId }, orderBy: { minMarks: 'desc' } });
  if (scales.length === 0) throw new Error("CONFIG_ERROR: No GradingScale configured for school");
  for (const scale of scales) {
    const min = Number(scale.minMarks);
    const max = Number(scale.maxMarks);
    if (percentage >= min && percentage <= max) {
      return { grade: scale.grade, gpaPoint: Number(scale.gpaPoint), remarks: scale.remarks || "" };
    }
  }
  return { grade: "F", gpaPoint: 0.0, remarks: "Fail" };
}
