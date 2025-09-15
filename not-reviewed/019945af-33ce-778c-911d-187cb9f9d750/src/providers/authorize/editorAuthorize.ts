import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { EditorPayload } from "../../decorators/payload/EditorPayload";

export async function editorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<EditorPayload> {
  const payload: EditorPayload = jwtAuthorize({ request }) as EditorPayload;

  if (payload.type !== "editor") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Query using id field since flex_office_editors is standalone
  const editor = await MyGlobal.prisma.flex_office_editors.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (editor === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
