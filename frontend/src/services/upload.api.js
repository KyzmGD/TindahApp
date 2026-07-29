import api from "./api";

export async function uploadImage(imageUri) {
  const formData = new FormData();

  formData.append("image", {
    uri: imageUri,
    name: "profile-photo.jpg",
    type: "image/jpeg",
  });

  const result = await api.post(
    "/upload/image",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return result.data.url;
}

export async function saveProfilePhoto(url, publicId) {
  const response = await api.post("/upload/save-profile-photo", { url, publicId });
  return response.data.photos;
}
