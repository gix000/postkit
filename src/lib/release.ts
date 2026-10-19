// The current panel release. The zip ships inside the site's server bundle (releases/);
// the first download uploads it to the private Supabase Storage bucket "releases",
// and every download after that gets a short-lived signed link to it.
// To publish a new version: put the zip in releases/ and change the version here.
export const release = {
  version: "1.0.0",
  bucket: "releases",
  path: "panel/PostKit-panel-1.0.0.zip",
  fileName: "PostKit-panel-1.0.0.zip",
  bundled: "releases/PostKit-panel-1.0.0.zip",
};
