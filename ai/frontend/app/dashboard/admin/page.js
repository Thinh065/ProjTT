"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@iconify/react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminPage() {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [newApiKey, setNewApiKey] = useState({ name: "", key: "", provider: "" })
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const user = JSON.parse(userData)
      if (user.role !== "admin") {
        router.push("/dashboard")
        return
      }
      setUser(user)
    }

    const fetchUsers = async () => {
      const token = localStorage.getItem("token")
      const res = await fetch("http://localhost:5000/api/auth/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setUsers(data)
      setLoading(false)
    }
    fetchUsers()

    // Mock data
    setApiKeys([
      {
        id: 1,
        name: "OpenAI GPT-4",
        provider: "OpenAI",
        key: "sk-...abc123",
        status: "active",
        createdAt: "2024-01-01",
      },
      {
        id: 2,
        name: "Claude API",
        provider: "Anthropic",
        key: "sk-...def456",
        status: "active",
        createdAt: "2024-01-02",
      },
    ])
  }, [router])

  const handleUserAction = (userId, action) => {
    setUsers(
      users
        .map((u) => {
          if (u.id === userId) {
            switch (action) {
              case "block":
                return { ...u, status: "blocked" }
              case "unblock":
                return { ...u, status: "active" }
              case "delete":
                return null
              case "promote":
                return { ...u, role: "admin" }
              case "demote":
                return { ...u, role: "user" }
              default:
                return u
            }
          }
          return u
        })
        .filter(Boolean),
    )
  }

  const handleAddApiKey = () => {
    if (!newApiKey.name || !newApiKey.key || !newApiKey.provider) {
      alert("Vui lòng điền đầy đủ thông tin!")
      return
    }

    const apiKey = {
      id: Date.now(),
      ...newApiKey,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    }

    setApiKeys([...apiKeys, apiKey])
    setNewApiKey({ name: "", key: "", provider: "" })
    alert("Thêm API Key thành công!")
  }

  const handleDeleteApiKey = (id) => {
    setApiKeys(apiKeys.filter((key) => key.id !== id))
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Icon icon="mdi:lock" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-500">Bạn cần quyền quản trị viên để truy cập trang này</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Quản trị hệ thống</h1>

      <div className="grid gap-6">
        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>Quản lý người dùng</CardTitle>
            <CardDescription>Quản lý tài khoản và phân quyền người dùng</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={user.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role === "admin" ? "Quản trị viên" : "Người dùng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "default" : "destructive"}>
                        {user.status === "active" ? "Hoạt động" : "Bị chặn"}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.createdAt}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {user.status === "active" ? (
                          <Button size="sm" variant="outline" onClick={() => handleUserAction(user.id, "block")}>
                            <Icon icon="mdi:block-helper" className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleUserAction(user.id, "unblock")}>
                            <Icon icon="mdi:check-circle" className="w-4 h-4" />
                          </Button>
                        )}
                        {user.role === "user" ? (
                          <Button size="sm" variant="outline" onClick={() => handleUserAction(user.id, "promote")}>
                            <Icon icon="mdi:arrow-up" className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleUserAction(user.id, "demote")}>
                            <Icon icon="mdi:arrow-down" className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Bạn có chắc muốn xóa người dùng này?")) {
                              handleUserAction(user.id, "delete")
                            }
                          }}
                        >
                          <Icon icon="mdi:delete" className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* API Key Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quản lý API Keys</CardTitle>
              <CardDescription>Quản lý các API key cho các ChatBot AI</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Icon icon="mdi:plus" className="w-4 h-4 mr-2" />
                  Thêm API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm API Key mới</DialogTitle>
                  <DialogDescription>Thêm API key cho ChatBot AI</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên</Label>
                    <Input
                      id="name"
                      value={newApiKey.name}
                      onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
                      placeholder="VD: OpenAI GPT-4"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provider">Nhà cung cấp</Label>
                    <Select
                      value={newApiKey.provider}
                      onValueChange={(value) => setNewApiKey({ ...newApiKey, provider: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn nhà cung cấp" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OpenAI">OpenAI</SelectItem>
                        <SelectItem value="Anthropic">Anthropic</SelectItem>
                        <SelectItem value="Google">Google</SelectItem>
                        <SelectItem value="Meta">Meta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="key">API Key</Label>
                    <Input
                      id="key"
                      type="password"
                      value={newApiKey.key}
                      onChange={(e) => setNewApiKey({ ...newApiKey, key: e.target.value })}
                      placeholder="sk-..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddApiKey}>Thêm API Key</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>{apiKey.provider}</TableCell>
                    <TableCell className="font-mono text-sm">{apiKey.key.substring(0, 8)}...</TableCell>
                    <TableCell>
                      <Badge variant="default">{apiKey.status === "active" ? "Hoạt động" : "Không hoạt động"}</Badge>
                    </TableCell>
                    <TableCell>{apiKey.createdAt}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Bạn có chắc muốn xóa API key này?")) {
                            handleDeleteApiKey(apiKey.id)
                          }
                        }}
                      >
                        <Icon icon="mdi:delete" className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
