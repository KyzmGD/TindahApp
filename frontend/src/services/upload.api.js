import api from "./api";


export async function uploadImage(imageUri) {

  const response = await fetch(imageUri);

  const blob = await response.blob();

  const formData = new FormData();

  formData.append("image", blob, "avatar.jpg");


  const result = await api.post(
    "/upload/image",
    formData,
    {
      headers:{
        "Content-Type":"multipart/form-data",
      },
    }
  );

  return response.data.url;
}

export async function saveProfilePhoto(url, publicId) {
  const response = await api.post("/upload/save-profile-photo", { url, publicId });
  return response.data.photos;
}
