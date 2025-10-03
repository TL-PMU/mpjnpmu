import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { MessageSquare, Send, Edit3, Trash2, X, Save, Clock, CheckCircle } from 'lucide-react'

export default function TaskComments({ taskId, currentUser, userProfile, profiles }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editText, setEditText] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef(null)
  const editTextareaRef = useRef(null)

  useEffect(() => {
    loadComments()
    // Set up real-time subscription
    const subscription = supabase
      .channel(`task_comments_${taskId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        }, 
        () => {
          loadComments()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [taskId])

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      const { error } = await supabase
        .from('task_comments')
        .insert([{
          task_id: taskId,
          user_id: currentUser.id,
          user_name: userProfile?.full_name || currentUser.email,
          comment_text: newComment
        }])

      if (error) throw error

      setNewComment('')
      loadComments()
    } catch (error) {
      alert(error.message)
    }
  }

  const handleEditComment = async (commentId) => {
    if (!editText.trim()) return

    try {
      const { error } = await supabase
        .from('task_comments')
        .update({ comment_text: editText })
        .eq('id', commentId)

      if (error) throw error

      setEditingCommentId(null)
      setEditText('')
      loadComments()
    } catch (error) {
      alert(error.message)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error
      loadComments()
    } catch (error) {
      alert(error.message)
    }
  }

  const startEdit = (comment) => {
    setEditingCommentId(comment.id)
    setEditText(comment.comment_text)
  }

  const cancelEdit = () => {
    setEditingCommentId(null)
    setEditText('')
  }

  const canEdit = (comment) => {
    const createdAt = new Date(comment.created_at)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return comment.user_id === currentUser.id && createdAt > fiveMinutesAgo
  }

  const canDelete = () => {
    return userProfile?.role === 'admin'
  }

  const insertMention = (profile, isEditing = false) => {
    const mentionText = `@[${profile.full_name || profile.email}](${profile.id})`
    const textarea = isEditing ? editTextareaRef.current : textareaRef.current
    const text = isEditing ? editText : newComment
    const setText = isEditing ? setEditText : setNewComment
    
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newText = text.substring(0, start) + mentionText + ' ' + text.substring(end)
      setText(newText)
      
      // Focus and set cursor position after mention
      setTimeout(() => {
        textarea.focus()
        const newPosition = start + mentionText.length + 1
        textarea.setSelectionRange(newPosition, newPosition)
      }, 0)
    }
    
    setShowMentions(false)
    setMentionSearch('')
  }

  const handleTextareaKeyDown = (e, isEditing = false) => {
    const text = isEditing ? editText : newComment
    
    if (e.key === '@') {
      setShowMentions(true)
      setCursorPosition(e.target.selectionStart)
    } else if (e.key === 'Escape' && showMentions) {
      setShowMentions(false)
      setMentionSearch('')
    }
  }

  const handleTextareaChange = (e, isEditing = false) => {
    const text = e.target.value
    const setText = isEditing ? setEditText : setNewComment
    setText(text)

    // Check if we're typing after @
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = text.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1 && cursorPos - lastAtIndex <= 50) {
      const searchText = textBeforeCursor.substring(lastAtIndex + 1)
      if (!searchText.includes(' ')) {
        setMentionSearch(searchText)
        setShowMentions(true)
      }
    } else {
      setShowMentions(false)
      setMentionSearch('')
    }
  }

  const renderCommentText = (text) => {
    // Convert @[name](uuid) to clickable mentions
    const mentionPattern = /@\[([^\]]+)\]\([a-f0-9\-]+\)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = mentionPattern.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      // Add mention as styled element
      parts.push(
        <span key={match.index} className="bg-blue-100 text-blue-800 px-1 rounded font-medium">
          @{match[1]}
        </span>
      )
      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  const filteredProfiles = mentionSearch
    ? profiles.filter(p => 
        (p.full_name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
         p.email?.toLowerCase().includes(mentionSearch.toLowerCase())) &&
        p.id !== currentUser.id
      )
    : profiles.filter(p => p.id !== currentUser.id)

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-water-100 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Comments List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-water-600">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 text-water-300" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="glass-card p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-water-800 text-sm">
                      {comment.user_name}
                    </span>
                    {comment.user_id === currentUser.id && (
                      <span className="text-xs bg-water-100 text-water-700 px-2 py-0.5 rounded">
                        You
                      </span>
                    )}
                    {comment.is_edited && (
                      <span className="text-xs text-gray-500 flex items-center">
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edited
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-water-600 flex items-center space-x-2">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(comment.created_at).toLocaleString()}</span>
                    {canEdit(comment) && (
                      <span className="text-green-600 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Can edit for {Math.max(0, Math.ceil((new Date(comment.created_at).getTime() + 5 * 60 * 1000 - Date.now()) / 60000))} min
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {canEdit(comment) && editingCommentId !== comment.id && (
                    <button
                      onClick={() => startEdit(comment)}
                      className="text-water-600 hover:text-water-800 p-1"
                      title="Edit comment (5 min window)"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete() && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete comment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {editingCommentId === comment.id ? (
                <div className="space-y-2">
                  <div className="relative">
                    <textarea
                      ref={editTextareaRef}
                      value={editText}
                      onChange={(e) => handleTextareaChange(e, true)}
                      onKeyDown={(e) => handleTextareaKeyDown(e, true)}
                      className="input-field text-sm min-h-[60px]"
                      rows="3"
                    />
                    {showMentions && (
                      <MentionDropdown
                        profiles={filteredProfiles}
                        onSelect={(profile) => insertMention(profile, true)}
                        onClose={() => setShowMentions(false)}
                      />
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditComment(comment.id)}
                      className="btn-primary text-sm"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="btn-secondary text-sm"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-water-700 text-sm whitespace-pre-wrap">
                  {renderCommentText(comment.comment_text)}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmitComment} className="glass-card p-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => handleTextareaChange(e, false)}
            onKeyDown={(e) => handleTextareaKeyDown(e, false)}
            placeholder="Write a comment... (Use @ to mention team members)"
            className="input-field text-sm min-h-[80px] mb-2"
            rows="3"
          />
          {showMentions && (
            <MentionDropdown
              profiles={filteredProfiles}
              onSelect={(profile) => insertMention(profile, false)}
              onClose={() => setShowMentions(false)}
            />
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-water-600">
            Tip: Type @ to mention someone
          </span>
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="btn-primary text-sm disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            Comment
          </button>
        </div>
      </form>

      <div className="text-xs text-water-600 space-y-1">
        <p>• Comments can be edited within 5 minutes of posting</p>
        <p>• Only admins can delete comments</p>
        <p>• Use @mention to notify team members</p>
      </div>
    </div>
  )
}

// Mention Dropdown Component
function MentionDropdown({ profiles, onSelect, onClose }) {
  return (
    <div className="absolute bottom-full mb-1 left-0 right-0 glass-card p-2 max-h-48 overflow-y-auto z-50 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-water-700">Mention someone:</span>
        <button
          onClick={onClose}
          className="text-water-400 hover:text-water-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {profiles.length === 0 ? (
        <div className="text-xs text-water-600 py-2">No matching team members</div>
      ) : (
        <div className="space-y-1">
          {profiles.slice(0, 10).map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => onSelect(profile)}
              className="w-full text-left px-2 py-1 rounded hover:bg-water-100 text-sm flex items-center justify-between"
            >
              <span className="text-water-800">{profile.full_name || profile.email}</span>
              <span className="text-xs text-water-600">{profile.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}