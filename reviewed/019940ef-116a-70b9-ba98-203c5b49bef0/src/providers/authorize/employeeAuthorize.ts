import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { EmployeePayload } from "../../decorators/payload/EmployeePayload";

export async function employeeAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<EmployeePayload> {
  const payload: EmployeePayload = jwtAuthorize({ request }) as EmployeePayload;

  if (payload.type !== "employee") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Query using appropriate field based on schema structure
  const employee = await MyGlobal.prisma.job_performance_eval_employees.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (employee === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
