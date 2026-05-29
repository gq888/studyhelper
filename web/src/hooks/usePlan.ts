import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/api/client'

export interface PlanItem {
  id: string
  planId: string
  date: string
  title: string
  courseId?: string | null
  minutes: number
  note?: string | null
  done: boolean
  doneAt?: string | null
  order: number
}

export interface Plan {
  id: string
  title: string
  goal?: string
  startDate: string
  endDate: string
  weeklyHours: number
  status: 'active' | 'done' | 'archived'
  color: string
  createdAt: string
  updatedAt: string
  progress: { done: number; total: number; percent: number }
  items?: PlanItem[]
  courses?: { id: string; title: string; category: string }[]
}

/**
 * 学习计划复用 Hook。可被 Home / Course / Chat 等模块调用。
 *
 * 用法：
 *   const { plans, addToPlan, createPlan, generateWithAI } = usePlan()
 *   addToPlan(planId, { title: '...', date: '...', courseId: ... })
 */
export function usePlan() {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ['plans'],
    queryFn: () => api<Plan[]>('/plans'),
  })

  const create = useMutation({
    mutationFn: (data: Partial<Plan>) =>
      api<Plan>('/plans', { method: 'POST', json: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] })
      toast.success('计划已创建')
    },
  })

  const remove = useMutation({
    mutationFn: (planId: string) => api(`/plans/${planId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  })

  const generateWithAI = useMutation({
    mutationFn: (payload: { goal: string; weeks?: number; weeklyHours?: number; courseIds?: string[]; startDate?: string }) =>
      api<Plan>('/ai/generate-plan', { method: 'POST', json: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] })
      toast.success('AI 计划已生成 ✨')
    },
  })

  /** 把单条任务追加到某个计划（被其他页面调用） */
  const addToPlan = useMutation({
    mutationFn: (args: { planId: string; item: Omit<PlanItem, 'id' | 'planId' | 'done'> }) =>
      api(`/plans/${args.planId}/items`, { method: 'POST', json: args.item }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['plans'] })
      qc.invalidateQueries({ queryKey: ['plan', vars.planId] })
      toast.success('已加入学习计划')
    },
  })

  const toggleItem = useMutation({
    mutationFn: (args: { planId: string; itemId: string; done: boolean }) =>
      api(`/plans/${args.planId}/items/${args.itemId}`, {
        method: 'PATCH',
        json: { done: args.done },
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['plan', vars.planId] })
      qc.invalidateQueries({ queryKey: ['plans'] })
      qc.invalidateQueries({ queryKey: ['heatmap'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const deleteItem = useMutation({
    mutationFn: (args: { planId: string; itemId: string }) =>
      api(`/plans/${args.planId}/items/${args.itemId}`, { method: 'DELETE' }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['plan', vars.planId] })
      qc.invalidateQueries({ queryKey: ['plans'] })
    },
  })

  return {
    plans: list.data ?? [],
    loadingPlans: list.isLoading,
    refetchPlans: list.refetch,
    createPlan: create.mutate,
    creating: create.isPending,
    removePlan: remove.mutate,
    generateWithAI: generateWithAI.mutate,
    generating: generateWithAI.isPending,
    addToPlan: addToPlan.mutate,
    toggleItem: toggleItem.mutate,
    deleteItem: deleteItem.mutate,
  }
}

export function usePlanDetail(planId?: string) {
  return useQuery({
    queryKey: ['plan', planId],
    queryFn: () => api<Plan>(`/plans/${planId}`),
    enabled: !!planId,
  })
}
