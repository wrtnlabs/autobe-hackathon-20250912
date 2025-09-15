import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ContentcreatorinstructorPayload } from "../../decorators/payload/ContentcreatorinstructorPayload";

export async function contentcreatorinstructorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<ContentcreatorinstructorPayload> {
  const payload: ContentcreatorinstructorPayload = jwtAuthorize({ request }) as ContentcreatorinstructorPayload;

  if (payload.type !== "contentcreatorinstructor") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // enterprise_lms_contentcreatorinstructor model is standalone with primary key id
  const contentCreatorInstructor = await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active" // Assuming status checks for activity
    },
  });

  if (contentCreatorInstructor === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
