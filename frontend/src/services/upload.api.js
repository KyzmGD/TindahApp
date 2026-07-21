import api from "./api";

export async function uploadImage(imageUri) {
  const formData = new FormData();

  formData.append("image", {
    uri: imageUri,
    name: "avatar.jpg",
    type: "image/jpeg",
  });

  const response = await api.post(
    "/upload/image",
    formData,
    {
      transformRequest: (data) => data,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data.url;
}

export async function saveProfilePhoto(url, publicId) {
  const response = await api.post("/upload/save-profile-photo", { url, publicId });
  return response.data.photos;
}
