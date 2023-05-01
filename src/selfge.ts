import requests from "@sunney/requests";

export default (subDomain: string) => ({
  client: requests.create({ baseUrl: `https://${subDomain}.self.ge` }),
  username: "",
  async login(username: string, password: string) {
    this.username = username;
    await this.client.get("/");

    const req = await this.client.post("/", {
      params: { option: "login" },
      body: `username=${username}&password=${password}&remember=1&return=`,
      content: "application/x-www-form-urlencoded",
    });

    if (req.status !== 200 || !req.redirected) {
      throw new Error("Login failed");
    }

    if (!req.headers.get("set-cookie")) {
      await this.login(username, password);
      return;
    }
  },
  async _changeStatus(status: "online" | "offline") {
    await this.client.post("/", {
      params: { option: "profileedit" },
      body: `task=${status === "online" ? "login" : "logout"}`,
      content: "application/x-www-form-urlencoded",
    });
  },
  async startJob() {
    await this._changeStatus("online");
  },
  async endJob() {
    await this._changeStatus("offline");
  },
  async getJobStatus(): Promise<"on" | "off"> {
    return await this.client
      .get(`/status/${this.username}`, {
        params: { t: new Date().getTime().toString() },
      })
      .then((res) =>
        typeof res.data === "string"
          ? res.data.includes("სამუშაოს დასრულება")
          : false
      )
      .then((res) => (res ? "on" : "off"));
  },
});
