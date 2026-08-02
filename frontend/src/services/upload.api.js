import api from "./api";

function getFileName(asset = {}) {
  if (asset.fileName) {
    return asset.fileName;
  }

  if (asset.uri && !asset.uri.startsWith("data:") && !asset.uri.startsWith("blob:")) {
    const nameFromUri = asset.uri.split("/").pop();

    if (nameFromUri && nameFromUri.includes(".")) {
      return nameFromUri;
    }
  }

  return "profile-photo.jpg";
}

function getMimeType(asset = {}) {
  if (asset.mimeType) {
    return asset.mimeType;
  }

  if (asset.file?.type) {
    return asset.file.type;
  }

  return "image/jpeg";
}

async function appendImageToFormData(formData, image) {
  const asset = typeof image === "string" ? { uri: image } : image;
  const name = getFileName(asset);
  const type = getMimeType(asset);

  if (asset.file) {
    formData.append("image", asset.file, name);
    return;
  }

  if (typeof window !== "undefined" && asset.uri) {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    formData.append("image", blob, name);
    return;
  }

  formData.append("image", {
    uri: asset.uri,
    name,
    type,
  });
}

function removeJsonContentType(headers) {
  if (!headers) {
    return;
  }

  if (typeof headers.delete === "function") {
    headers.delete("Content-Type");
    headers.delete("content-type");
    return;
  }

  delete headers["Content-Type"];
  delete headers["content-type"];
}

export async function uploadProfileImage(image) {
  const formData = new FormData();

  await appendImageToFormData(formData, image);

  const result = await api.post(
    "/upload/image",
    formData,
    {
      transformRequest: [(data, headers) => {
        removeJsonContentType(headers);
        return data;
      }],
    },
  );

  return {
    url: result.data.url,
    publicId: result.data.publicId || null,
    storage: result.data.storage || null,
  };
}

export async function uploadImage(imageUri) {
  const uploadedImage = await uploadProfileImage(imageUri);
  return uploadedImage.url;
}

export async function saveProfilePhoto(url, publicId) {
  const response = await api.post("/upload/save-profile-photo", { url, publicId });
  return response.data.photos;
}

export async function saveAvatar(url, publicId) {
  const response = await api.post("/upload/save-avatar", { url, publicId });
  return response.data.user;
}
