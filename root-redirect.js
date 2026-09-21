export default {
  fetch(request) {
    const url = new URL(request.url);
    url.hostname = "www.slokachits.com";
    return Response.redirect(url.toString(), 301);
  },
};
