import { app } from "./app"

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {

    return await app.fetch(request)
  },
}