import { useMutation } from '@tanstack/react-query'
import type { ChangePasswordInput, UpdateProfileInput, User } from '@/contracts/auth'
import { apiClient } from '@/lib/api/client'
import { sessionStore } from '@/lib/auth/session-store'
import { resizeToSquare } from '@/lib/image'

export async function updateProfile(input: UpdateProfileInput) {
  const { data } = await apiClient.patch<User>('/me', input)
  return data
}

export async function uploadAvatar(file: File) {
  const body = new FormData()
  body.append('avatar', await resizeToSquare(file))
  const { data } = await apiClient.put<User>('/me/avatar', body)
  return data
}

export async function removeAvatar() {
  const { data } = await apiClient.delete<User>('/me/avatar')
  return data
}

export async function changePassword(input: ChangePasswordInput) {
  await apiClient.post('/me/password', input)
}

/**
 * Os dados do usuário vivem na sessão (header, checkout e perfil leem de lá);
 * cada alteração confirmada pelo servidor atualiza a sessão.
 */
const syncSession = (user: User) => sessionStore.updateUser(user)

export const useUpdateProfile = () => useMutation({ mutationFn: updateProfile, onSuccess: syncSession })
export const useUploadAvatar = () => useMutation({ mutationFn: uploadAvatar, onSuccess: syncSession })
export const useRemoveAvatar = () => useMutation({ mutationFn: removeAvatar, onSuccess: syncSession })
export const useChangePassword = () => useMutation({ mutationFn: changePassword })
