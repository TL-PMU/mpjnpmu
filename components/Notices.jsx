import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Bell, Plus, Edit3, Trash2, X, Save, Image as ImageIcon, Video, Pin, Eye, Filter, Tag, Folder } from 'lucide-react'
import useSWR from 'swr'

const fetcher = async (query) => {
  const { data, error } = await supabase.from(query.table).select(query.select)
  if (error) throw error
  return data
}

export default function Notices({ currentUser, userProfile }) {
  const [showAddNotice, setShowAddNotice] = useState(false)
  const [selectedNotice, setSelectedNotice] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedTag, setSelectedTag] = useState(null)

  const { data: notices, error: noticesError, mutate: mutateNotices } = useSWR(
    { table: 'notices_view', select: '*' },
    fetcher,
    { refreshInterval: 30000 }
  )

  const { data: categories } = useSWR(
    { table: 'notice_categories', select: '*' },
    fetcher
  )

  const { data: tags } = useSWR(
    { table: 'notice_tags', select: '*' },
    fetcher
  )

  const isAdmin = userProfile?.role === 'admin'

  const filteredNotices = notices?.filter(notice => {
    if (selectedCategory && notice.category_id !== selectedCategory) return false
    if (selectedTag && !notice.tag_ids?.includes(selectedTag)) return false
    return true
  })

  const sortedNotices = filteredNotices?.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.published_at) - new Date(a.published_at)
  })

  if (!currentUser) {
    return (
      <div className="glass-card p-8 text-center">
        <Bell className="w-16 h-16 text-water-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-water-700 mb-2">Authentication Required</h3>
        <p className="text-water-600">Please sign in to view notices and announcements.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-water-600" />
            <h2 className="text-2xl font-bold text-water-800">Notices & Information</h2>
          </div>
          
          {isAdmin && (
            <button onClick={() => setShowAddNotice(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Post Notice
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-water-700 mb-2 flex items-center space-x-2">
              <Folder className="w-4 h-4" />
              <span>Filter by Category</span>
            </label>
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
              className="input-field"
            >
              <option value="">All Categories</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-water-700 mb-2 flex items-center space-x-2">
              <Tag className="w-4 h-4" />
              <span>Filter by Tag</span>
            </label>
            <select
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value ? parseInt(e.target.value) : null)}
              className="input-field"
            >
              <option value="">All Tags</option>
              {tags?.map(tag => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(selectedCategory || selectedTag) && (
          <button
            onClick={() => {
              setSelectedCategory(null)
              setSelectedTag(null)
            }}
            className="btn-secondary text-sm mt-3"
          >
            Clear Filters
          </button>
        )}
      </div>

      {showAddNotice && (
        <NoticeModal
          categories={categories}
          tags={tags}
          currentUser={currentUser}
          userProfile={userProfile}
          onClose={() => setShowAddNotice(false)}
          onSaved={mutateNotices}
        />
      )}

      {selectedNotice && (
        <ViewNoticeModal
          notice={selectedNotice}
          isAdmin={isAdmin}
          onClose={() => setSelectedNotice(null)}
          onDelete={mutateNotices}
        />
      )}

      <div className="space-y-4">
        {noticesError ? (
          <div className="glass-card p-8 text-center">
            <p className="text-red-600">Error loading notices</p>
          </div>
        ) : !sortedNotices ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-6 bg-water-100 rounded mb-2"></div>
                <div className="h-4 bg-water-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : sortedNotices.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Bell className="w-16 h-16 text-water-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-water-700 mb-2">No Notices Found</h3>
            <p className="text-water-600">
              {isAdmin ? 'Post your first notice to get started!' : 'Check back later for updates.'}
            </p>
          </div>
        ) : (
          sortedNotices.map((notice, index) => (
            <NoticeCard
              key={notice.id}
              notice={notice}
              isAdmin={isAdmin}
              onClick={() => setSelectedNotice(notice)}
              onDelete={mutateNotices}
              index={index}
            />
          ))
        )}
      </div>
    </div>
  )
}

function NoticeCard({ notice, isAdmin, onClick, onDelete, index }) {
  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this notice?')) return

    try {
      const { error } = await supabase.from('notices').delete().eq('id', notice.id)
      if (error) throw error
      onDelete()
    } catch (error) {
      alert(error.message)
    }
  }

  return (
    <div
      className="glass-card p-6 hover:scale-[1.01] transition-all duration-200 cursor-pointer animate-slide-up"
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {notice.is_pinned && <Pin className="w-4 h-4 text-yellow-600" />}
            <h3 className="text-xl font-semibold text-water-800">{notice.title}</h3>
          </div>

          <div className="flex items-center flex-wrap gap-2 mb-3">
            {notice.category_name && (
              <span
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: notice.category_color }}
              >
                {notice.category_icon} {notice.category_name}
              </span>
            )}
            {notice.tags?.map((tag, i) => (
              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                #{tag}
              </span>
            ))}
          </div>

          <div className="text-water-600 line-clamp-2 mb-3" dangerouslySetInnerHTML={{ __html: notice.content }} />

          <div className="flex items-center space-x-4 text-sm text-water-600">
            <span className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>{notice.view_count || 0} views</span>
            </span>
            <span>By {notice.author_name}</span>
            <span>{new Date(notice.published_at).toLocaleDateString()}</span>
          </div>
        </div>

        {isAdmin && (
          <button onClick={handleDelete} className="ml-4 text-red-600 hover:text-red-800 p-2">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {(notice.image_url || notice.video_url) && (
        <div className="flex items-center space-x-3 text-sm text-water-600 mt-3">
          {notice.image_url && (
            <span className="flex items-center space-x-1">
              <ImageIcon className="w-4 h-4" />
              <span>Has image</span>
            </span>
          )}
          {notice.video_url && (
            <span className="flex items-center space-x-1">
              <Video className="w-4 h-4" />
              <span>Has video</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function NoticeModal({ notice, categories, tags, currentUser, userProfile, onClose, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: notice?.title || '',
    content: notice?.content || '',
    category_id: notice?.category_id || '',
    selectedTags: notice?.tag_ids || [],
    video_url: notice?.video_url || '',
    is_pinned: notice?.is_pinned || false
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(notice?.image_url || null)
  const fileInputRef = useRef(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB')
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const uploadImage = async () => {
    if (!imageFile) return notice?.image_url || null

    try {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('notice-images')
        .upload(filePath, imageFile)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('notice-images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Image upload error:', error)
      throw error
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const imageUrl = await uploadImage()

      const noticeData = {
        title: formData.title,
        content: formData.content,
        category_id: formData.category_id || null,
        author_id: currentUser.id,
        author_name: userProfile?.full_name || currentUser.email,
        image_url: imageUrl,
        video_url: formData.video_url || null,
        is_pinned: formData.is_pinned
      }

      const { data: savedNotice, error } = await supabase
        .from('notices')
        .insert([noticeData])
        .select()
        .single()

      if (error) throw error

      if (formData.selectedTags.length > 0) {
        const tagAssignments = formData.selectedTags.map(tagId => ({
          notice_id: savedNotice.id,
          tag_id: tagId
        }))

        const { error: tagError } = await supabase
          .from('notice_tag_assignments')
          .insert(tagAssignments)

        if (tagError) throw tagError
      }

      onSaved()
      onClose()
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleTag = (tagId) => {
    if (formData.selectedTags.includes(tagId)) {
      setFormData({
        ...formData,
        selectedTags: formData.selectedTags.filter(id => id !== tagId)
      })
    } else {
      setFormData({
        ...formData,
        selectedTags: [...formData.selectedTags, tagId]
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="glass-card p-6 w-full max-w-3xl animate-slide-up my-8">
        <h3 className="text-lg font-semibold text-water-800 mb-4">
          {notice ? 'Edit Notice' : 'Post New Notice'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-water-700 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter notice title"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-water-700 mb-2">
              Content * (HTML supported)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter notice content. You can use HTML: <b>bold</b>, <i>italic</i>, <br/> for line break"
              className="input-field min-h-[200px] font-mono text-sm"
              rows="10"
              required
            />
            <p className="text-xs text-water-600 mt-1">
              Tip: Use HTML tags for formatting
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-water-700 mb-2">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) : '' })}
                className="input-field"
              >
                <option value="">Select category</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-water-700 mb-2">
                Video URL (YouTube/Vimeo)
              </label>
              <input
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-water-700 mb-2">Tags (select multiple)</label>
            <div className="glass-card p-3 max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {tags?.map(tag => (
                  <label
                    key={tag.id}
                    className={`px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${
                      formData.selectedTags.includes(tag.id)
                        ? 'bg-water-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedTags.includes(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                      className="hidden"
                    />
                    #{tag.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-water-700 mb-2">
              Image Upload (Max 5MB)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-sm"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Choose Image
              </button>
              {imagePreview && (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview(null)
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_pinned}
                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                className="w-4 h-4 text-water-500 border-water-300 rounded"
              />
              <Pin className="w-4 h-4 text-water-600" />
              <span className="text-sm font-medium text-water-700">Pin this notice to top</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Publishing...' : 'Publish Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ViewNoticeModal({ notice, isAdmin, onClose, onDelete }) {
  const [viewIncremented, setViewIncremented] = useState(false)

  useEffect(() => {
    if (!viewIncremented && notice.id) {
      incrementView()
      setViewIncremented(true)
    }
  }, [notice.id, viewIncremented])

  const incrementView = async () => {
    try {
      await supabase.rpc('increment_notice_views', { notice_id_param: notice.id })
    } catch (error) {
      console.error('Error incrementing views:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this notice?')) return

    try {
      const { error } = await supabase.from('notices').delete().eq('id', notice.id)
      if (error) throw error
      onDelete()
      onClose()
    } catch (error) {
      alert(error.message)
    }
  }

  const getVideoEmbedUrl = (url) => {
    if (!url) return null
    
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`
    }
    
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`
    }
    
    return null
  }

  const embedUrl = getVideoEmbedUrl(notice.video_url)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="glass-card p-6 w-full max-w-4xl animate-slide-up my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-3">
              {notice.is_pinned && <Pin className="w-5 h-5 text-yellow-600" />}
              <h2 className="text-3xl font-bold text-water-800">{notice.title}</h2>
            </div>

            <div className="flex items-center flex-wrap gap-2 mb-4">
              {notice.category_name && (
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: notice.category_color }}
                >
                  {notice.category_icon} {notice.category_name}
                </span>
              )}
              {notice.tags?.map((tag, i) => (
                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-4 text-sm text-water-600 mb-6">
              <span className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{(notice.view_count || 0) + 1} views</span>
              </span>
              <span>By {notice.author_name}</span>
              <span>{new Date(notice.published_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {isAdmin && (
              <button onClick={handleDelete} className="btn-secondary hover:bg-red-50 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="text-water-400 hover:text-water-600 text-2xl">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="prose max-w-none">
          <div className="text-water-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: notice.content }} />
        </div>

        {notice.image_url && (
          <div className="mt-6">
            <img src={notice.image_url} alt={notice.title} className="w-full rounded-lg shadow-lg" />
          </div>
        )}

        {embedUrl && (
          <div className="mt-6">
            <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-water-200">
          <div className="text-sm text-water-600">
            {notice.updated_at !== notice.published_at && (
              <p>Last updated: {new Date(notice.updated_at).toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}