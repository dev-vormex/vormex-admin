'use client';

import { useEffect, useState } from 'react';
import { getPosts, deletePost, AdminPost } from '@/lib/api/admin';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import {
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Eye,
  Heart,
  MessageSquare,
  Image,
  Video,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flag,
} from 'lucide-react';

export default function PostsPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedPost, setSelectedPost] = useState<AdminPost | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'text' | 'image' | 'video' | 'article'>('all');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await getPosts({
        page,
        limit: 10,
        search: search || undefined,
        type: filter !== 'all' ? filter : undefined,
      });
      setPosts(response.posts);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page, filter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (page === 1) {
        fetchPosts();
      } else {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [search]);

  const handleDelete = async () => {
    if (!selectedPost) return;
    setActionLoading(true);
    try {
      await deletePost(selectedPost.id);
      setShowDeleteModal(false);
      setSelectedPost(null);
      fetchPosts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete post');
    } finally {
      setActionLoading(false);
    }
  };

  const getMediaIcon = (mediaType?: string) => {
    switch (mediaType) {
      case 'image':
        return <Image className="w-4 h-4 text-green-500" />;
      case 'video':
        return <Video className="w-4 h-4 text-purple-500" />;
      case 'document':
        return <FileText className="w-4 h-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-gray-500 mt-1">
            Manage all {total.toLocaleString()} posts on the platform
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search posts by content or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Posts</option>
              <option value="reported">Reported</option>
              <option value="image">With Images</option>
              <option value="video">With Videos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchPosts}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No posts found</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex gap-4">
                    {/* Author Avatar */}
                    {post.author.profileImage ? (
                      <img
                        src={post.author.profileImage}
                        alt={post.author.name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {post.author.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                      </div>
                    )}

                    {/* Post Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`/dashboard/users/${post.author.id}`}
                              className="font-semibold text-gray-900 hover:text-blue-600"
                            >
                              {post.author.name}
                            </a>
                            {post.author.username && (
                              <span className="text-gray-500 text-sm">
                                @{post.author.username}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {post.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {formatRelativeTime(post.createdAt)}
                          </p>
                        </div>

                        {/* Actions Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setDropdownOpen(
                                dropdownOpen === post.id ? null : post.id
                              )
                            }
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>
                          {dropdownOpen === post.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              <button
                                onClick={() => {
                                  setSelectedPost(post);
                                  setShowViewModal(true);
                                  setDropdownOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Eye className="w-4 h-4" />
                                View Full Post
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPost(post);
                                  setShowDeleteModal(true);
                                  setDropdownOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Post
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">
                        {post.articleTitle && <strong>{post.articleTitle}</strong>}
                        {post.content && truncateContent(post.content)}
                      </p>

                      {/* Media Preview */}
                      {post.mediaUrls && post.mediaUrls.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <Image className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-500">
                            {post.mediaUrls.length} media file(s)
                          </span>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Heart className="w-4 h-4" />
                          <span className="text-sm">
                            {post.likesCount} likes
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-sm">
                            {post.commentsCount} comments
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {(page - 1) * 10 + 1} to{' '}
                {Math.min(page * 10, total)} of {total} posts
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selectedPost.author.profileImage ? (
                    <img
                      src={selectedPost.author.profileImage}
                      alt={selectedPost.author.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {selectedPost.author.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedPost.author.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(selectedPost.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedPost(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <p className="text-gray-700 whitespace-pre-wrap mb-4">
                {selectedPost.content}
              </p>

              {selectedPost.mediaUrls && selectedPost.mediaUrls.length > 0 && (
                <div className="grid gap-2 mb-4">
                  {selectedPost.mediaUrls.map((url, index) => (
                    <div key={index}>
                      {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img
                          src={url}
                          alt={`Media ${index + 1}`}
                          className="rounded-lg max-h-96 object-contain"
                        />
                      ) : url.match(/\.(mp4|webm|mov)$/i) ? (
                        <video
                          src={url}
                          controls
                          className="rounded-lg max-h-96"
                        />
                      ) : (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:underline"
                        >
                          <FileText className="w-4 h-4" />
                          Document {index + 1}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-gray-500">
                  <Heart className="w-5 h-5" />
                  <span>{selectedPost.likesCount} likes</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <MessageSquare className="w-5 h-5" />
                  <span>{selectedPost.commentsCount} comments</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setShowDeleteModal(true);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Post
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this post by{' '}
              <strong>
                {selectedPost.author.name}
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedPost(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
