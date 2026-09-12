const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const Banner = require("../src/models/BannerModel");
const cloudinary = require("../src/config/cloudinary");
const controller = require("../src/controllers/banner.controller");

let uploads, destroyed, stored, response, failure;
beforeEach(() => {
  uploads = 0; destroyed = []; stored = null; response = null; failure = null;
  cloudinary.uploader.upload_stream = (_options, callback) => ({ end() {
    uploads++;
    callback(null, { secure_url: `https://res.cloudinary.com/test/${uploads}`, public_id: `banners/${uploads}` });
  } });
  cloudinary.uploader.destroy = async (id) => { destroyed.push(id); };
  Banner.create = async (values) => { stored = values; return values; };
});
const request = (body = {}) => ({ params: {}, body: { title: "Summer", href: "/shop", order: "2", ...body }, files: { desktop: [{ buffer: Buffer.from("desktop") }], mobile: [{ buffer: Buffer.from("mobile") }] } });
const res = { status() { return this; }, json(value) { response = value; } };
const next = (error) => { failure = error; };

test("creates a banner with paired Cloudinary images", async () => {
  await controller.saveBanner(request(), res, next);
  assert.equal(failure, null);
  assert.equal(uploads, 2);
  assert.equal(stored.order, 2);
  assert.equal(stored.desktop.publicId, "banners/1");
  assert.equal(stored.mobile.publicId, "banners/2");
  assert.equal(response.success, true);
});
test("requires both variants before uploading", async () => {
  const req = request(); delete req.files.mobile;
  await controller.saveBanner(req, res, next);
  assert.equal(failure.statusCode, 400);
  assert.equal(uploads, 0);
});
test("rejects unsafe links and invalid order before uploading", async () => {
  for (const body of [{ href: "//example.com" }, { href: "/\\example.com" }, { href: "javascript:alert(1)" }, { order: "-1" }, { order: "1.5" }]) {
    await controller.saveBanner(request(body), res, next);
    assert.equal(failure.statusCode, 400);
  }
  assert.equal(uploads, 0);
});
test("cleans up both uploaded assets if database save fails", async () => {
  Banner.create = async () => { throw new Error("Database unavailable"); };
  await controller.saveBanner(request(), res, next);
  assert.equal(failure.message, "Database unavailable");
  assert.deepEqual(destroyed, ["banners/1", "banners/2"]);
});
test("cleans up desktop image if mobile upload fails", async () => {
  cloudinary.uploader.upload_stream = (_options, callback) => ({ end() {
    uploads++;
    if (uploads === 2) callback(new Error("Upload failed"));
    else callback(null, { secure_url: "https://example.com/image", public_id: "banners/1" });
  } });
  await controller.saveBanner(request(), res, next);
  assert.equal(failure.message, "Upload failed");
  assert.deepEqual(destroyed, ["banners/1"]);
});
test("replacing one variant preserves the other and removes the old asset", async () => {
  const banner = { desktop: { publicId: "old-desktop" }, mobile: { publicId: "old-mobile" }, set(values) { Object.assign(this, values); }, async save() {} };
  Banner.findById = async () => banner;
  const req = request(); req.params.id = "507f1f77bcf86cd799439011"; delete req.files.mobile;
  await controller.saveBanner(req, res, next);
  assert.equal(failure, null);
  assert.equal(banner.mobile.publicId, "old-mobile");
  assert.deepEqual(destroyed, ["old-desktop"]);
});
